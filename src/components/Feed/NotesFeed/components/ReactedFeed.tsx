import { useEffect, useRef } from "react";
import { CircularProgress } from "@mui/material";
import { useUserContext } from "../../../../hooks/useUserContext";
import { useReactedNotes } from "../hooks/useReactedNotes";
import ReactedNoteCard from "./ReactedNoteCard";
import { Event } from "nostr-tools";
import { Virtuoso } from "react-virtuoso";
import type { VirtuosoHandle } from "react-virtuoso";
import useImmersiveScroll from "../../../../hooks/useImmersiveScroll";

const ReactedFeed = () => {
  const { user } = useUserContext();
  const { reactedEvents, reactionEvents, fetchReactedNotes, loading } =
    useReactedNotes(user);
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useImmersiveScroll(containerRef, virtuosoRef, { smooth: true });

  useEffect(() => {
    if (reactedEvents.size === 0) {
      fetchReactedNotes();
    }
  }, [user, reactedEvents, fetchReactedNotes]);

  const sorted = Array.from(reactedEvents.values()).sort(
    (a, b) => b.created_at - a.created_at,
  );

  return (
    <div ref={containerRef} style={{ height: "100vh" }}>
      <Virtuoso
        ref={virtuosoRef}
        data={sorted}
        itemContent={(index, note: Event) => (
          <ReactedNoteCard
            key={note.id}
            note={note}
            reactions={Array.from(reactionEvents.values())}
          />
        )}
        endReached={() => {
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
