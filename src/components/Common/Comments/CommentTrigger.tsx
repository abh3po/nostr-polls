import React from "react";
import { Tooltip, Typography } from "@mui/material";
import CommentIcon from "@mui/icons-material/Comment";
import { useAppContext } from "../../../hooks/useAppContext";

interface CommentTriggerProps {
  eventId: string;
  showComments: boolean;
  onToggleComments: () => void;
}

const CommentTrigger: React.FC<CommentTriggerProps> = ({ 
  eventId, 
  showComments, 
  onToggleComments 
}) => {
  const { commentsMap } = useAppContext();
  const comments = commentsMap?.get(eventId) || [];

  return (
    <Tooltip title={showComments ? "Hide Comments" : "View Comments"}>
      <span
        onClick={onToggleComments}
        style={{ cursor: "pointer", display: "flex", flexDirection: "row" }}
      >
        <CommentIcon
          sx={(theme) => ({
            color: theme.palette.mode === "light" ? "black" : "white",
          })}
        />
        <Typography>{comments.length ? comments.length : null}</Typography>
      </span>
    </Tooltip>
  );
};

export default CommentTrigger;
