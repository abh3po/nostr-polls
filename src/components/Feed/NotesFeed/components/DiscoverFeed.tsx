// src/features/Notes/components/Feeds/DiscoverFeed.tsx

import { useEffect, useMemo } from "react";
import { Button, CircularProgress } from "@mui/material";
import { Virtuoso } from "react-virtuoso";
import { useUserContext } from "../../../../hooks/useUserContext";
import RepostsCard from "./RepostedNoteCard";
import { useDiscoverNotes } from "../hooks/useDiscoverNotes";

const DiscoverFeed = () => {
  const { user, requestLogin } = useUserContext();
  const { notes, fetchNotes, loadingMore } = useDiscoverNotes();

  useEffect(() => {
    if (user && user.webOfTrust && user.webOfTrust.size > 0) {
      fetchNotes(user.webOfTrust);
    }
  }, [user, user?.webOfTrust]);

  // Sort posts by latest activity (same as FollowingFeed)
  const mergedNotes = useMemo(() => {
    return Array.from(notes.values())
      .map((note) => {
        const latestActivity = note.created_at;
        return { note, latestActivity };
      })
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
    </div>
  );
};

export default DiscoverFeed;
