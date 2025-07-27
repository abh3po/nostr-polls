import { useEffect, useMemo } from "react";
import { Button, CircularProgress } from "@mui/material";
import { useFollowingNotes } from "../hooks/useFollowingNotes";
import { useUserContext } from "../../../../hooks/useUserContext";
import { Notes } from "../../../Notes";
import { Virtuoso } from "react-virtuoso/dist";

const FollowingFeed = () => {
  const { user, requestLogin } = useUserContext();
  const { events, fetchNotes, loadingMore, fetchNewerNotes } =
    useFollowingNotes(user);

  const sorted = useMemo(() => {
    return Array.from(events.values()).sort(
      (a, b) => b.created_at - a.created_at
    );
  }, [events]);
  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  return (
    <div>
      {" "}
      <Virtuoso
        data={sorted}
        itemContent={(index, event) => <Notes event={event} />}
        style={{ height: "100vh" }} // Fill screen
        followOutput={false} // Prevent auto-scroll-to-bottom unless you want it
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
