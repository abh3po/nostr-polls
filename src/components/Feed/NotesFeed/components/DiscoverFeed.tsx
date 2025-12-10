// src/features/Notes/components/Feeds/DiscoverFeed.tsx

import { useEffect, useMemo } from "react";
import { Button, CircularProgress, Fab } from "@mui/material";
import { Virtuoso } from "react-virtuoso";
import { useUserContext } from "../../../../hooks/useUserContext";
import RepostsCard from "./RepostedNoteCard";
import { useDiscoverNotes } from "../hooks/useDiscoverNotes";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const DiscoverFeed = () => {
  const { user, requestLogin } = useUserContext();
  const { notes, newNotes, fetchNotes, loadingMore, mergeNewNotes } =
    useDiscoverNotes();

  useEffect(() => {
    if (
      (!notes || notes.size === 0) &&
      user &&
      user.webOfTrust &&
      user.webOfTrust.size > 0
    ) {
      fetchNotes(user.webOfTrust);
    }
  }, [user?.pubkey]);

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

      <Virtuoso
        data={mergedNotes}
        itemContent={(index, item) => (
          <RepostsCard note={item.note} reposts={[]} />
        )}
        style={{ height: "100vh" }}
        followOutput={false}
      />

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
