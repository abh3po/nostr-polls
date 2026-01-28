import { useState, useRef, useCallback } from "react";
import { Event, Filter } from "nostr-tools";
import { useRelays } from "../../../../hooks/useRelays";
import { nostrRuntime } from "../../../../singletons";
import { useUserContext } from "../../../../hooks/useUserContext";

export const useFollowingNotes = () => {
  const [loadingMore, setLoadingMore] = useState(false);
  const [version, setVersion] = useState(0); // Trigger for re-queries
  const missingNotesRef = useRef<Set<string>>(new Set());

  const { relays } = useRelays();
  const { user } = useUserContext();

  // Query runtime for notes and reposts
  const notes = useCallback(() => {
    if (!user?.follows?.length) return new Map<string, Event>();

    const events = nostrRuntime.query({
      kinds: [1],
      authors: Array.from(user.follows),
    });

    const noteMap = new Map<string, Event>();
    for (const event of events) {
      noteMap.set(event.id, event);
    }
    return noteMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.follows, version]);

  const reposts = useCallback(() => {
    if (!user?.follows?.length) return new Map<string, Event[]>();

    const events = nostrRuntime.query({
      kinds: [6],
      authors: Array.from(user.follows),
    });

    const repostMap = new Map<string, Event[]>();
    for (const event of events) {
      const originalNoteId = event.tags.find((t) => t[0] === "e")?.[1];
      if (originalNoteId) {
        const existing = repostMap.get(originalNoteId) || [];
        if (!existing.find((e) => e.id === event.id)) {
          repostMap.set(originalNoteId, [...existing, event]);
        }
      }
    }
    return repostMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.follows, version]);

  const fetchNotes = async () => {
    if (!user?.follows?.length || loadingMore) return;

    setLoadingMore(true);
    const authors = Array.from(user.follows);

    const noteFilter: Filter = {
      kinds: [1],
      authors,
      limit: 10,
    };

    const currentNotes = notes();
    if (currentNotes.size > 0) {
      noteFilter.until = Array.from(currentNotes.values()).sort(
        (a, b) => a.created_at - b.created_at
      )[0].created_at;
    }

    const repostFilter: Filter = {
      kinds: [6],
      authors,
      limit: 10,
    };

    const currentReposts = reposts();
    if (currentReposts.size > 0) {
      const oldestRepostTime = Math.min(
        ...Array.from(currentReposts.values()).flat().map((r) => r.created_at)
      );
      repostFilter.until = oldestRepostTime;
    }

    const handle = nostrRuntime.subscribe(relays, [noteFilter, repostFilter], {
      onEvent: (event: Event) => {
        if (event.kind === 6) {
          const originalNoteId = event.tags.find((t) => t[0] === "e")?.[1];
          if (originalNoteId) {
            missingNotesRef.current.add(originalNoteId);
          }
        }
        // Events are automatically added to runtime by SubscriptionManager
        setVersion((v) => v + 1);
      },
      onEose: () => {
        handle.unsubscribe();
        startMissingNotesFetcher();
        setLoadingMore(false);
      },
    });
  };

  const fetchNewerNotes = async () => {
    if (!user?.follows?.length) return;

    setLoadingMore(true);
    const authors = Array.from(user.follows);

    const noteFilter: Filter = {
      kinds: [1],
      authors,
    };

    const currentNotes = notes();
    if (currentNotes.size > 0) {
      const latest = Array.from(currentNotes.values()).sort(
        (a, b) => b.created_at - a.created_at
      )[0];
      noteFilter.since = latest.created_at + 1;
    }

    const repostFilter: Filter = {
      kinds: [6],
      authors,
    };

    const currentReposts = reposts();
    if (currentReposts.size > 0) {
      const latestRepost = Array.from(currentReposts.values())
        .flat()
        .sort((a, b) => b.created_at - a.created_at)[0];
      repostFilter.since = latestRepost.created_at + 1;
    }

    const handle = nostrRuntime.subscribe(relays, [noteFilter, repostFilter], {
      onEvent: (event: Event) => {
        if (event.kind === 6) {
          const originalNoteId = event.tags.find((t) => t[0] === "e")?.[1];
          if (originalNoteId) {
            missingNotesRef.current.add(originalNoteId);
          }
        }
        // Events are automatically added to runtime by SubscriptionManager
        setVersion((v) => v + 1);
      },
      onEose: () => {
        handle.unsubscribe();
        startMissingNotesFetcher();
        setLoadingMore(false);
      },
    });
  };

  const startMissingNotesFetcher = () => {
    const idsToFetch = Array.from(missingNotesRef.current);
    if (idsToFetch.length === 0) return;

    const fetchedIds = new Set<string>();

    const handle = nostrRuntime.subscribe(
      relays,
      [
        {
          kinds: [1],
          ids: idsToFetch,
        },
      ],
      {
        onEvent: (event: Event) => {
          fetchedIds.add(event.id);
          setVersion((v) => v + 1);
        },
      }
    );

    const interval = setInterval(() => {
      const stillMissing = idsToFetch.filter((id) => !fetchedIds.has(id));
      if (stillMissing.length === 0) {
        clearInterval(interval);
        handle.unsubscribe();
        missingNotesRef.current.clear();
        return;
      }

      // Retry fetching missing notes
      nostrRuntime.subscribe(
        relays,
        [
          {
            kinds: [1],
            ids: stillMissing,
          },
        ],
        {
          onEvent: (event: Event) => {
            fetchedIds.add(event.id);
            setVersion((v) => v + 1);
          },
        }
      );
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      handle.unsubscribe();
      missingNotesRef.current.clear();
    }, 5000);
  };

  return {
    notes: notes(),
    reposts: reposts(),
    fetchNotes,
    fetchNewerNotes,
    loadingMore,
  };
};
