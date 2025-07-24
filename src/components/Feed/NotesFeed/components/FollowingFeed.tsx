import React, { useEffect } from "react";
import { Button, CircularProgress } from "@mui/material";
import { useFollowingNotes } from "../hooks/useFollowingNotes";
import { useUserContext } from "../../../../hooks/useUserContext";
import { Notes } from "../../../Notes";

const FollowingFeed = () => {
  const { user } = useUserContext();
  const { events, fetchNotes, loadingMore } = useFollowingNotes(user);

  const sorted = Array.from(events.values()).sort(
    (a, b) => b.created_at - a.created_at
  );
  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  return (
    <>
      {sorted.map((e) => (
        <Notes key={e.id} event={e} />
      ))}

      <div style={{ textAlign: "center", margin: 20 }}>
        <Button onClick={fetchNotes} variant="contained" disabled={loadingMore}>
          {loadingMore ? (
            <CircularProgress size={24} />
          ) : !!user ? (
            "Load More"
          ) : (
            "Login"
          )}
        </Button>
      </div>
    </>
  );
};

export default FollowingFeed;
