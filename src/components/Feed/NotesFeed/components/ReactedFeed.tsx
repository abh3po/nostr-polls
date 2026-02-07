import { useEffect } from "react";
import { useUserContext } from "../../../../hooks/useUserContext";
import { useReactedNotes } from "../hooks/useReactedNotes";
import ReactedNoteCard from "./ReactedNoteCard";
import { Event } from "nostr-tools";
import UnifiedFeed from "../../UnifiedFeed";

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
    (a, b) => b.created_at - a.created_at,
  );

  return (
    <UnifiedFeed
      data={sorted}
      loadingMore={loading}
      onEndReached={fetchReactedNotes}
      itemContent={(index, note: Event) => (
        <ReactedNoteCard
          key={note.id}
          note={note}
          reactions={Array.from(reactionEvents.values())}
        />
      )}
    />
  );
};

export default ReactedFeed;
