import React from "react";
import { Event } from "nostr-tools";
import { makeStyles } from "@mui/styles";
import ReplayIcon from "@mui/icons-material/Replay";
import Typography from "@mui/material/Typography";
import OverlappingAvatars from "../Common/OverlappingAvatars";
import PollResponseForm from "../PollResponse/PollResponseForm";
import { Notes } from "../Notes";

const useStyles = makeStyles(() => ({
  root: {
    margin: "20px auto",
    width: "100%",
    maxWidth: "600px",
  },
  repostText: {
    fontSize: "0.75rem",
    color: "#4caf50",
    marginLeft: "10px",
    marginRight: 10,
    display: "flex",
    flexDirection: "row",
  },
}));

interface FeedItemProps {
  event: Event;
  repostedBy: string[];
  userResponse?: Event;
}

export const FeedItem: React.FC<FeedItemProps> = ({
  event,
  repostedBy,
  userResponse,
}) => {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      {repostedBy.length > 0 && (
        <div className={classes.repostText}>
          <ReplayIcon />
          <Typography style={{ marginRight: 10 }}>Reposted by</Typography>
          <OverlappingAvatars ids={repostedBy} />
        </div>
      )}
      {event.kind === 1 ? (
        <Notes event={event} />
      ) : event.kind === 1068 ? (
        <PollResponseForm pollEvent={event} userResponse={userResponse} />
      ) : null}
    </div>
  );
};
