import { useEffect } from "react";
import { CircularProgress } from "@mui/material";
import { useUserContext } from "../../../../hooks/useUserContext";
import { useReactedNotes } from "../hooks/useReactedNotes";
import ReactedNoteCard from "./ReactedNoteCard";
import { Event } from "nostr-tools";
import { Virtuoso } from "react-virtuoso";

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
    <div style={{ height: "100vh" }}>
      <Virtuoso
        data={sorted}
        itemContent={(index, note: Event) => (
          <ReactedNoteCard
            key={note.id}
            note={note}
            reactions={Array.from(reactionEvents.values())}
          />
        )}
        endReached={() => {
          console.log("Reached bottom, loading more...");
          fetchReactedNotes();
        }}
        components={{
          Footer: () =>
            loading ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <CircularProgress size={24} />
              </div>
            ) : null,
        }}
      />
    </div>
  );
};

export default ReactedFeed;
