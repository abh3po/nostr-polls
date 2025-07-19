import { useState } from "react";
import { Event, Filter, SimplePool } from "nostr-tools";
import { useRelays } from "../../../../hooks/useRelays";

export const useReactedNotes = (user: any) => {
  const [reactedEvents, setReactedEvents] = useState<Map<string, Event>>(new Map());
  const [reactionEvents, setReactionEvents] = useState<Map<string, Event>>(new Map());
  const [loading, setLoading] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState<number | undefined>(undefined);
  const { relays } = useRelays();

  const fetchReactedNotes = async () => {
    if (!user?.follows?.length || loading) return;
    setLoading(true);

    const pool = new SimplePool();

    // Step 1: Get reactions
    const reactionFilter: Filter = {
      kinds: [7],
      authors: user.follows,
      limit: 20,
    };
    if (lastTimestamp) {
      reactionFilter.until = lastTimestamp;
    }

    const newReactionEvents = await pool.querySync(relays, reactionFilter);

    const updatedReactionEvents = new Map(reactionEvents);
    newReactionEvents.forEach((e) => updatedReactionEvents.set(e.id, e));
    setReactionEvents(updatedReactionEvents);

    const reactedNoteIds = newReactionEvents
      .map((e) => e.tags.find((tag) => tag[0] === "e")?.[1])
      .filter(Boolean);

    const uniqueNoteIds = Array.from(new Set(reactedNoteIds));

    // Step 2: Fetch the original notes
    const noteFilter: Filter = {
      kinds: [1],
      ids: uniqueNoteIds.filter((id) => id !== undefined),
    };

    const noteEvents = await pool.querySync(relays, noteFilter);

    const updated = new Map(reactedEvents);
    noteEvents.forEach((e) => updated.set(e.id, e));
    setReactedEvents(updated);

    if (newReactionEvents.length > 0) {
      const oldest = newReactionEvents.reduce((min, e) =>
        e.created_at < min.created_at ? e : min
      );
      setLastTimestamp(oldest.created_at);
    }

    setLoading(false);
  };

  return {
    reactedEvents,
    reactionEvents,
    fetchReactedNotes,
    loading,
  };
};
