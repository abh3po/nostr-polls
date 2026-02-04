// src/hooks/useMyTopicsFeed.ts

import { useEffect, useMemo, useRef, useState } from "react";
import { Event } from "nostr-tools";
import { pool, nostrRuntime } from "../singletons";
import { useRelays } from "./useRelays";
import { useUserContext } from "./useUserContext";
import { signEvent } from "../nostr";

export const OFFTOPIC_KIND = 1011;

type TopicModeration = {
  offTopicNotes: Map<string, Set<string>>; // noteId -> moderators
  blockedUsers: Map<string, Set<string>>; // pubkey -> moderators
};

type TopicNote = {
  event: Event;
  topics: string[];
};

type FeedMode = "unfiltered" | "global" | "contacts";

export function useMyTopicsFeed(myTopics: Set<string>) {
  const { relays } = useRelays();
  const { user, requestLogin } = useUserContext();

  const [notes, setNotes] = useState<Map<string, TopicNote>>(new Map());
  const [feedMode, setFeedMode] = useState<FeedMode>("global");
  const [showAnyway, setShowAnyway] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const moderationByTopic = useRef<Map<string, TopicModeration>>(new Map());
  const seenNotes = useRef<Set<string>>(new Set());
  const seenModeration = useRef<Set<string>>(new Set());

  /* ------------------ moderation processing ------------------ */

  const processModerationEvent = (event: Event) => {
    if (seenModeration.current.has(event.id)) return;
    seenModeration.current.add(event.id);

    const topicTags = event.tags
      .filter((t) => t[0] === "t")
      .map((t) => t[1]);
    const eTags = event.tags
      .filter((t) => t[0] === "e")
      .map((t) => t[1]);
    const pTags = event.tags
      .filter((t) => t[0] === "p")
      .map((t) => t[1]);

    for (const topic of topicTags) {
      if (!myTopics.has(topic)) continue;

      if (!moderationByTopic.current.has(topic)) {
        moderationByTopic.current.set(topic, {
          offTopicNotes: new Map(),
          blockedUsers: new Map(),
        });
      }

      const mod = moderationByTopic.current.get(topic)!;

      for (const noteId of eTags) {
        if (!mod.offTopicNotes.has(noteId)) {
          mod.offTopicNotes.set(noteId, new Set());
        }
        mod.offTopicNotes.get(noteId)!.add(event.pubkey);
      }

      for (const pubkey of pTags) {
        if (!mod.blockedUsers.has(pubkey)) {
          mod.blockedUsers.set(pubkey, new Set());
        }
        mod.blockedUsers.get(pubkey)!.add(event.pubkey);
      }
    }

    // force rerender
    setNotes((prev) => new Map(prev));
  };

  /* ------------------ subscriptions ------------------ */

  useEffect(() => {
    if (!relays.length || myTopics.size === 0) {
      setLoading(false);
      return;
    }

    const topics = Array.from(myTopics);

    const sub = nostrRuntime.subscribe(
      relays,
      [
        { kinds: [1], "#t": topics, limit: 200 },
        { kinds: [OFFTOPIC_KIND], "#t": topics, limit: 500 },
      ],
      {
        onEvent: (event) => {
          /* ---- moderation events ---- */
          if (event.kind === OFFTOPIC_KIND) {
            processModerationEvent(event);
            return;
          }

          /* ---- notes ---- */
          if (event.kind === 1) {
            if (seenNotes.current.has(event.id)) return;
            seenNotes.current.add(event.id);

            const topics = event.tags
              .filter((t) => t[0] === "t" && myTopics.has(t[1]))
              .map((t) => t[1]);

            if (topics.length === 0) return;

            setNotes((prev) => {
              const next = new Map(prev);
              next.set(event.id, { event, topics });
              return next;
            });
            setLoading(false);
          }
        },
      }
    );
    const timeout = setTimeout(() => setLoading(false), 10000);

    return () => {
      sub.unsubscribe();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relays, myTopics]);

  /* ------------------ moderation resolution ------------------ */

  const resolvedNotes = useMemo(() => {
    return Array.from(notes.values())
      .map(({ event, topics }) => {
        let hidden = false;
        let moderators = new Set<string>();
        let moderatedTopics = new Set<string>();

        if (feedMode !== "unfiltered") {
          for (const topic of topics) {
            const mod = moderationByTopic.current.get(topic);
            if (!mod) continue;

            const offTopic = mod.offTopicNotes.get(event.id);
            const blocked = mod.blockedUsers.get(event.pubkey);

            const relevantMods = new Set<string>([
              ...Array.from(offTopic || []),
              ...Array.from(blocked || []),
            ]);

            const visibleMods =
              feedMode === "contacts" && user?.follows
                ? Array.from(relevantMods).filter((m) =>
                    user.follows!.includes(m)
                  )
                : Array.from(relevantMods);

            if (visibleMods.length > 0) {
              hidden = true;
              moderatedTopics.add(topic);
              visibleMods.forEach((m) => moderators.add(m));
            }
          }
        }

        if (showAnyway.has(event.id)) hidden = false;

        return {
          event,
          topics,
          hidden,
          moderators,
          moderatedTopics,
        };
      })
      .sort((a, b) => b.event.created_at - a.event.created_at);
  }, [notes, feedMode, showAnyway, user?.follows]);

  /* ------------------ actions ------------------ */

  const toggleShowAnyway = (noteId: string) => {
    setShowAnyway((prev) => {
      const next = new Set(prev);
      next.has(noteId) ? next.delete(noteId) : next.add(noteId);
      return next;
    });
  };

  const publishModeration = async (
    type: "off-topic" | "remove-user",
    note: Event,
    topics: string[]
  ) => {
    if (!user) {
      requestLogin();
      return;
    }

    for (const topic of topics) {
      const tags =
        type === "off-topic"
          ? [
              ["t", topic],
              ["e", note.id],
            ]
          : [
              ["t", topic],
              ["p", note.pubkey],
            ];

      const signed = await signEvent({
        kind: OFFTOPIC_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content:
          type === "off-topic"
            ? "Marked as off-topic"
            : "Removed user from topic",
      });

      await pool.publish(relays, signed);

      // Optimistic local update
      if (!moderationByTopic.current.has(topic)) {
        moderationByTopic.current.set(topic, {
          offTopicNotes: new Map(),
          blockedUsers: new Map(),
        });
      }
      const mod = moderationByTopic.current.get(topic)!;
      if (type === "off-topic") {
        if (!mod.offTopicNotes.has(note.id))
          mod.offTopicNotes.set(note.id, new Set());
        mod.offTopicNotes.get(note.id)!.add(user.pubkey);
      } else {
        if (!mod.blockedUsers.has(note.pubkey))
          mod.blockedUsers.set(note.pubkey, new Set());
        mod.blockedUsers.get(note.pubkey)!.add(user.pubkey);
      }
    }

    // Force re-render for immediate UI feedback
    setNotes((prev) => new Map(prev));

    // Refetch own moderation events to ensure consistency
    try {
      const topicValues = Array.from(new Set(topics));
      const events = await nostrRuntime.fetchOne(relays, {
        kinds: [OFFTOPIC_KIND],
        authors: [user.pubkey],
        "#t": topicValues,
      });
      if (events) {
        processModerationEvent(events);
      }
    } catch (e) {
      console.error("Failed to refetch moderation events:", e);
    }
  };

  return {
    notes: resolvedNotes,
    feedMode,
    setFeedMode,
    toggleShowAnyway,
    publishModeration,
    loading,
  };
}
