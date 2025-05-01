import React, { useEffect, useState } from "react";
import { Event, SimplePool } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import { Notes } from "../Notes";
import { useUserContext } from "../../hooks/useUserContext";
import { Button, CircularProgress } from "@mui/material";

const NOTES_BATCH_SIZE = 40;

const NotesFeed: React.FC = () => {
  const [events, setEvents] = useState<Map<string, Event>>(new Map());
  const [loadingMore, setLoadingMore] = useState(false);
  const [until, setUntil] = useState<number | undefined>(undefined);
  const { user } = useUserContext();

  const fetchNotes = () => {
    if (!user || !user.follows || user.follows.length === 0) return;

    const pool = new SimplePool();
    let eventCount = 0;

    const filter = {
      kinds: [1],
      authors: Array.from(user.follows),
      ...(until && { until }),
    };

    const sub = pool.subscribeMany(defaultRelays, [filter], {
      onevent: (event) => {
        setEvents((prev) => {
          if (prev.has(event.id)) return prev;

          const updated = new Map(prev);
          updated.set(event.id, event);

          return updated;
        });

        // Track oldest timestamp for pagination
        if (!until || event.created_at < until) {
          setUntil(event.created_at);
        }

        eventCount++;
        if (eventCount >= NOTES_BATCH_SIZE) {
          sub.close(); // 🔒 Force-close after limit
          setLoadingMore(false);
        }
      },
      oneose: () => {
        sub.close(); // safety net
        setLoadingMore(false);
      },
    });
  };

  useEffect(() => {
    fetchNotes(); // initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLoadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    fetchNotes();
  };

  const sortedEvents = Array.from(events.values()).sort(
    (a, b) => b.created_at - a.created_at
  );

  return (
    <>
      {sortedEvents.map((e) => (
        <Notes key={e.id} event={e} />
      ))}
      <div style={{ textAlign: "center", margin: 20 }}>
        <Button
          onClick={handleLoadMore}
          variant="contained"
          disabled={loadingMore}
        >
          {loadingMore ? <CircularProgress size={24} /> : "Load More"}
        </Button>
      </div>
    </>
  );
};

export default NotesFeed;
