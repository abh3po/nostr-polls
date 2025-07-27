import { useEffect, useMemo } from "react";
import { Button, CircularProgress } from "@mui/material";
import { useFollowingNotes } from "../hooks/useFollowingNotes";
import { useUserContext } from "../../../../hooks/useUserContext";
import { Notes } from "../../../Notes";
import PullToRefresh from "react-pull-to-refresh";

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
  }, [user, fetchNotes]);

  return (
    <PullToRefresh onRefresh={fetchNewerNotes}>
      {sorted.map((e) => (
        <Notes key={e.id} event={e} />
      ))}

      <div style={{ textAlign: "center", margin: 20 }}>
        <Button
          onClick={!user ? requestLogin : fetchNotes}
          variant="contained"
          disabled={loadingMore}
        >
          {loadingMore ? (
            <CircularProgress size={24} />
          ) : !!user ? (
            "Load More"
          ) : (
            "Login"
          )}
        </Button>
      </div>
    </PullToRefresh>
  );
};

export default FollowingFeed;
