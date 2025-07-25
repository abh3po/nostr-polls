import { useState } from "react";
import { Event, Filter, SimplePool } from "nostr-tools";
import { useRelays } from "../../../../hooks/useRelays";


export const useFollowingNotes = (user: any) => {
  const [events, setEvents] = useState<Map<string, Event>>(new Map());
  const [loadingMore, setLoadingMore] = useState(false);
  const { relays } = useRelays();

  const fetchNotes = async () => {
    if (!user?.follows?.length || loadingMore) return;

    setLoadingMore(true);
    const pool = new SimplePool();

    const filter: Filter = {
      kinds: [1],
      authors: Array.from(user.follows),
      limit: 10,
    };

    if (events.size > 0) {
      filter.until = Array.from(events.values()).sort(
        (a, b) => a.created_at - b.created_at
      )[0].created_at;
    }

    const fetchedEvents = await pool.querySync(relays, filter);
    setEvents((prev) => {
      const updated = new Map(prev);
      fetchedEvents.forEach((e) => updated.set(e.id, e));
      return updated;
    });

    setLoadingMore(false);
  };

  return { events, fetchNotes, loadingMore };
};
