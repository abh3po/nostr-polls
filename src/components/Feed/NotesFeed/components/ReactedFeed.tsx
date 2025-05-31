import { useEffect } from "react";
import { Button, CircularProgress } from "@mui/material";
import { useUserContext } from "../../../../hooks/useUserContext";
import { useReactedNotes } from "../hooks/useReactedNotes";
import ReactedNoteCard from "./ReactedNoteCard";
import { Event } from "nostr-tools";

const ReactedFeed = () => {
  const { user } = useUserContext();
  const { reactedEvents, reactionEvents, fetchReactedNotes, loading } =
    useReactedNotes(user);

  useEffect(() => {
    if (reactedEvents.size === 0) {
      fetchReactedNotes();
    }
  }, [user, reactedEvents, fetchReactedNotes]);

  const sorted = Array.from(reactedEvents.values()).sort(
    (a, b) => b.created_at - a.created_at
  );

  return (
    <>
      {sorted.map((note: Event) => (
        <ReactedNoteCard
          key={note.id}
          note={note}
          reactions={Array.from(reactionEvents.values())}
        />
      ))}

      <div style={{ textAlign: "center", margin: 20 }}>
        <Button onClick={fetchReactedNotes} disabled={loading} variant="contained">
          {loading ? <CircularProgress size={24} /> : "Load More"}
        </Button>
      </div>
    </>
  );
};

export default ReactedFeed;
