import React, { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Typography,
} from "@mui/material";
import { useAppContext } from "../../../hooks/useAppContext";
import { signEvent } from "../../../nostr";
import { useRelays } from "../../../hooks/useRelays";
import { Event, nip19 } from "nostr-tools";
import { DEFAULT_IMAGE_URL } from "../../../utils/constants";
import CommentIcon from "@mui/icons-material/Comment";
import { useUserContext } from "../../../hooks/useUserContext";
import { TextWithImages } from "../Parsers/TextWithImages";
import { calculateTimeAgo } from "../../../utils/common";
import CommentInput from "./CommentInput";
import { getColorsWithTheme } from "../../../styles/theme";
import { SubCloser } from "nostr-tools/lib/types/pool";
import { useNotification } from "../../../contexts/notification-context";
import { NOTIFICATION_MESSAGES } from "../../../constants/notifications";
import { pool } from "../../../singletons";

interface CommentSectionProps {
  eventId: string;
  showComments: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({ eventId, showComments }) => {
  const { showNotification } = useNotification();
  const {
    profiles,
    fetchUserProfileThrottled,
    fetchCommentsThrottled,
    commentsMap,
    addEventToMap,
  } = useAppContext();

  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showReplies, setShowReplies] = useState<Map<string, boolean>>(
    new Map()
  );

  const { user } = useUserContext();
  const { relays } = useRelays();

  const fetchComments = () => {
    let filter = {
      kinds: [1],
      "#e": [eventId],
    };
    let closer = pool.subscribeMany(relays, [filter], {
      onevent: addEventToMap,
    });
    return closer;
  };

  useEffect(() => {
    let closer: SubCloser | undefined;
    if (!closer && showComments) {
      closer = fetchComments();
      return () => {
        if (closer) closer.close();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments]);

  useEffect(() => {
    if (!commentsMap?.get(eventId)) {
      fetchCommentsThrottled(eventId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitComment = async (content: string, parentId?: string) => {
    if (!user) {
      showNotification(NOTIFICATION_MESSAGES.LOGIN_TO_COMMENT, "warning");
      return;
    }

    const commentEvent = {
      kind: 1,
      content: content,
      tags: [
        ["e", eventId, "", "root"],
        ...(parentId ? [["e", parentId, "", "reply"]] : []),
      ],
      created_at: Math.floor(Date.now() / 1000),
    };

    const signedComment = await signEvent(commentEvent, user.privateKey);
    pool.publish(relays, signedComment!);
    setReplyTo(null);
  };

  const renderComments = (comments: Event[], parentId: string | null) => {
    return comments
      .filter((comment) => {
        const isReplyTo = comment.tags.filter(
          (tag) => tag[3] === "reply"
        )?.[0]?.[1];

        if (parentId === null) {
          return !isReplyTo || replyTo === eventId;
        }

        // If parentId is specified, we want replies to that parentId
        return comment.tags.some(
          (tag) => tag[1] === parentId && tag[3] === "reply"
        );
      })
      .map((comment) => {
        const commentUser = profiles?.get(comment.pubkey);
        if (!commentUser) fetchUserProfileThrottled(comment.pubkey); // Fetch user profile if not found

        const hasReplies = comments.some((c) =>
          c.tags.some((tag) => tag[3] === "reply" && tag[1] === comment.id)
        );

        return (
          <div key={comment.id} style={{ marginLeft: "8px" }}>
            <Card variant="outlined" style={{ marginTop: "8px" }}>
              <CardHeader
                avatar={
                  <Avatar src={commentUser?.picture || DEFAULT_IMAGE_URL} />
                }
                title={
                  profiles?.get(comment.pubkey)?.name ||
                  nip19.npubEncode(comment.pubkey).substring(0, 10) + "..."
                }
                subheader={calculateTimeAgo(comment.created_at)}
              />
              <CardContent style={{ marginLeft: "8px", padding: "8px"}}>
                <Typography>
                  <TextWithImages content={comment.content} />
                </Typography>
              </CardContent>
              <CardActions style={{ marginLeft: "16px", marginBottom: "16px", padding: "0px" }}>
                <CommentIcon
                  onClick={() =>
                    setReplyTo(replyTo === comment.id ? null : comment.id)
                  }
                  sx={(theme) => {
                    return {
                      color: theme.palette.mode === "light" ? "black" : "white",
                      fontSize: 18,
                      cursor: "pointer"
                    };
                  }}
                />
                {/* Show/Hide Replies Button */}
                {hasReplies && (
                  <Button
                    onClick={() =>
                      setShowReplies((prev) => {
                        const updated = new Map(prev);
                        updated.set(comment.id, !prev.get(comment.id));
                        return updated;
                      })
                    }
                    size="small"
                    style={{ marginLeft: "16px", padding: 0, top: 0 }}
                    sx={(theme) => ({
                      ...getColorsWithTheme(theme, { color: "#000000" }),
                    })}
                  >
                    {showReplies.get(comment.id)
                      ? "Hide Replies"
                      : "Show Replies"}
                  </Button>
                )}
              </CardActions>
            </Card>
            {/* Reply Button */}

            {/* Render reply input only if this comment is selected for replying */}
            {replyTo === comment.id && (
              <CommentInput
                onSubmit={(content) => {
                  handleSubmitComment(content, comment.id);
                  setReplyTo(null); // Reset replyTo after submitting
                }}
              />
            )}
            {/* Render child comments if visible */}
            {showReplies.get(comment.id) &&
              renderComments(comments, comment.id)}
          </div>
        );
      });
  };

  const comments = commentsMap?.get(eventId) || [];
  const localCommentsMap = new Map((comments || []).map((c) => [c.id, c]));

  if (!showComments) {
    return null;
  }

  return (
    <div style={{ width: "100%", marginTop: "16px" }}>
      <CommentInput onSubmit={(content) => handleSubmitComment(content)} />
      <div style={{ marginTop: "16px" }}>
        {comments.length === 0 ? <h5>No Comments</h5> : <h5>Comments</h5>}
        {renderComments(Array.from(localCommentsMap.values()), null)}
      </div>
    </div>
  );
};

export default CommentSection;
