import { useEffect, useMemo, useRef } from "react";
import { Button, CircularProgress } from "@mui/material";
import { useUserContext } from "../../../../hooks/useUserContext";
import { Virtuoso } from "react-virtuoso";
import type { VirtuosoHandle } from "react-virtuoso";
import useImmersiveScroll from "../../../../hooks/useImmersiveScroll";
import RepostsCard from "./RepostedNoteCard";
import { useFollowingNotes } from "../hooks/useFollowingNotes";
import type { NoteMode } from "./index";

const isRootNote = (event: { tags: string[][] }) =>
  !event.tags.some((t) => t[0] === "e");

const FollowingFeed = ({ noteMode }: { noteMode: NoteMode }) => {
  const { user, requestLogin } = useUserContext();
  const { notes, reposts, fetchNotes, loadingMore, fetchNewerNotes } =
    useFollowingNotes();
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useImmersiveScroll(containerRef, virtuosoRef, { smooth: true });

  // Merge notes and reposts for sorting by created_at
  // Each item: { note: Event, reposts: Event[] }
  const mergedNotes = useMemo(() => {
    return Array.from(notes.values())
      .filter((note) =>
        noteMode === "notes" ? isRootNote(note) : !isRootNote(note)
      )
      .map((note) => {
        const noteReposts = reposts.get(note.id) || [];
        const latestRepostTime = noteReposts.length
          ? Math.max(...noteReposts.map((r) => r.created_at))
          : 0;

        const latestActivity = Math.max(note.created_at, latestRepostTime);

        return {
          note,
          reposts: noteReposts,
          latestActivity,
        };
      })
      .sort((a, b) => b.latestActivity - a.latestActivity);
  }, [notes, reposts, noteMode]);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div>
      {!user ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            margin: 10,
          }}
        >
          <Button variant="contained" onClick={requestLogin}>
            login to view feed
          </Button>
        </div>
      ) : null}
      {loadingMore ? <CircularProgress /> : null}
      <div ref={containerRef} style={{ height: "100vh" }}>
        <Virtuoso
          ref={virtuosoRef}
          data={mergedNotes}
          itemContent={(index, item) => {
            return (
              <RepostsCard
                note={item.note}
                reposts={reposts.get(item.note.id) || []}
              />
            );
          }}
          style={{ height: "100%" }}
          followOutput={false}
          startReached={() => {
            fetchNewerNotes();
          }}
          endReached={() => {
            fetchNotes();
          }}
        />
      </div>
    </div>
  );
};

export default FollowingFeed;
