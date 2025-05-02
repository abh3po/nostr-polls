import React, { useEffect, useState } from "react";
import { Event, Filter, SimplePool } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import { Notes } from "../Notes";
import { useUserContext } from "../../hooks/useUserContext";
import { Button, CircularProgress } from "@mui/material";

const NOTES_BATCH_SIZE = 10;

const NotesFeed: React.FC = () => {
  const [events, setEvents] = useState<Map<string, Event>>(new Map());
  const [loadingMore, setLoadingMore] = useState(false);
  const { user } = useUserContext();

  const fetchNotes = async () => {
    if (!user || !user.follows || user.follows.length === 0) return;
    if (loadingMore) return;

    setLoadingMore(true);
    const pool = new SimplePool();

    const filter: Filter = {
      kinds: [1],
      authors: Array.from(user.follows),
      limit: NOTES_BATCH_SIZE,
    };
    if (events.size > 0)
      // Calculate the "since" parameter based on the latest event in the current events map
      filter.until = Array.from(events.values()).sort(
        (a, b) => a.created_at - b.created_at
      )[0].created_at;
    const fetchedEvents = await pool.querySync(defaultRelays, filter);
    setEvents((prev) => {
      const updated = new Map(prev);
      fetchedEvents.forEach((e) => updated.set(e.id, e));
      return updated;
    });
    setLoadingMore(false);
  };
  useEffect(() => {
    if (!events.size && user) fetchNotes();
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
