// src/features/Notes/components/Feeds/DiscoverFeed.tsx

import { useEffect, useMemo, useRef } from "react";
import { Button, CircularProgress, Fab } from "@mui/material";
import { Virtuoso } from "react-virtuoso";
// add:
import type { VirtuosoHandle } from "react-virtuoso";
import useImmersiveScroll from "../../../../hooks/useImmersiveScroll";
import { useUserContext } from "../../../../hooks/useUserContext";
import RepostsCard from "./RepostedNoteCard";
import { useDiscoverNotes } from "../hooks/useDiscoverNotes";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const DiscoverFeed = () => {
  const { user, requestLogin } = useUserContext();
  const { notes, newNotes, fetchNotes, loadingMore, mergeNewNotes } =
    useDiscoverNotes();
  // add:
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useImmersiveScroll(containerRef, virtuosoRef, { smooth: true });

  useEffect(() => {
    if (
      (!notes || notes.size === 0) &&
      user &&
      user.webOfTrust &&
      user.webOfTrust.size > 0
    ) {
      fetchNotes(user.webOfTrust);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const mergedNotes = useMemo(() => {
    return Array.from(notes.values())
      .map((note) => ({
        note,
        latestActivity: note.created_at,
      }))
      .sort((a, b) => b.latestActivity - a.latestActivity);
  }, [notes]);

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

      {loadingMore && (
        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 16 }}
        >
          <CircularProgress />
        </div>
      )}

      <div ref={containerRef} style={{ height: "100vh" }}>
        <Virtuoso
          ref={virtuosoRef}
          data={mergedNotes}
          itemContent={(index, item) => (
            <RepostsCard note={item.note} reposts={[]} />
          )}
          style={{ height: "100%" }}
          followOutput={false}
        />
      </div>

      {/* Floating button for new notes */}
      {newNotes.size > 0 && (
        <Fab
          color="primary"
          aria-label="new posts"
          onClick={mergeNewNotes}
          sx={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <KeyboardArrowUpIcon /> See {newNotes.size} new posts
        </Fab>
      )}
    </div>
  );
};

export default DiscoverFeed;
