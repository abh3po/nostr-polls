import { useEffect, useMemo } from "react";
import { Button, CircularProgress } from "@mui/material";
import { useUserContext } from "../../../../hooks/useUserContext";
import { Virtuoso } from "react-virtuoso";
import RepostsCard from "./RepostedNoteCard"; // your new reposts card component
import { useFollowingNotes } from "../hooks/useFollowingNotes";

const FollowingFeed = () => {
  const { user, requestLogin } = useUserContext();
  const { notes, reposts, fetchNotes, loadingMore, fetchNewerNotes } =
    useFollowingNotes();

  // Merge notes and reposts for sorting by created_at
  // Each item: { note: Event, reposts: Event[] }
  const mergedNotes = useMemo(() => {
    return Array.from(notes.values())
      .map((note) => {
        const noteReposts = reposts.get(note.id) || [];
        if(noteReposts.length !== 0) console.log("THIS POST HAS A REPOST")
        // Get the latest repost time, if any
        const latestRepostTime = noteReposts.length
          ? Math.max(...noteReposts.map(r => r.created_at))
          : 0;
  
        // Use the later of the note's created_at or the latest repost's created_at
        const latestActivity = Math.max(note.created_at, latestRepostTime);
  
        return {
          note,
          reposts: noteReposts,
          latestActivity,
        };
      })
      .sort((a, b) => b.latestActivity - a.latestActivity);
  }, [notes, reposts]);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
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
      <Virtuoso
        useWindowScroll
        data={mergedNotes}
        itemContent={(index, item) => {
          return <RepostsCard note={item.note} reposts={reposts.get(item.note.id) || []} />
        }}
        followOutput={false}
        startReached={() => {
          console.log("Top reached!");
          fetchNewerNotes();
        }}
        endReached={() => {
          console.log("Bottom reached!");
          fetchNotes();
        }}
      />
    </div>
  );
};

export default FollowingFeed;
