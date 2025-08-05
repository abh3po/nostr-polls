import React, { useState } from "react";
import { Card, CardContent, Divider } from "@mui/material";
import Rate from "../Ratings/Rate";
import CommentTrigger from "../Common/Comments/CommentTrigger";
import CommentSection from "../Common/Comments/CommentSection";
import Likes from "../Common/Likes/likes";
import Zap from "../Common/Zaps/zaps";
import { Event } from "nostr-tools";
import RepostButton from "../Common/Repost/reposts";

interface FeedbackMenuProps {
  event: Event;
}

export const FeedbackMenu: React.FC<FeedbackMenuProps> = ({ event }) => {
  const [showComments, setShowComments] = useState(false);

  const handleToggleComments = () => {
    setShowComments(!showComments);
  };

  return (
    <>
      <Card>
        <CardContent>
          <div
            style={{
              justifyContent: "flex-start",
              display: "flex",
              marginBottom: 8,
            }}
          >
            <Rate entityId={event.id} entityType="event" />
          </div>
          <Divider style={{ marginBottom: 16 }} />
          {/* Feedback Icons Row */}
          <div style={{
            display: "flex",
            justifyContent: "space-between"
          }}>
            <div>
              <CommentTrigger
                eventId={event.id}
                showComments={showComments}
                onToggleComments={handleToggleComments}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Likes pollEvent={event} />
            </div>
            <div>
            <RepostButton event={event} />
          </div>
            <div>
              <Zap pollEvent={event} />
            </div>
          </div>
          {/* Comment Section */}
          <CommentSection
            eventId={event.id}
            showComments={showComments}
          />
        </CardContent>
      </Card>
    </>
  );
};
