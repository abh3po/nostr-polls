import React, { useState } from "react";
import {
  Card,
  CardContent,
  Collapse,
  Box,
  IconButton,
  Typography,
  Grow,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import Rate from "../Ratings/Rate";
import CommentTrigger from "../Common/Comments/CommentTrigger";
import CommentSection from "../Common/Comments/CommentSection";
import Likes from "../Common/Likes/likes";
import Zap from "../Common/Zaps/zaps";
import { Event } from "nostr-tools";
import RepostButton from "../Common/Repost/reposts";
import ShareButton from "../Common/Share/ShareButton";
import { useRating } from "../../hooks/useRating";

interface FeedbackMenuProps {
  event: Event;
}

export const FeedbackMenu: React.FC<FeedbackMenuProps> = ({ event }) => {
  const [showComments, setShowComments] = useState(false);
  const [showRating, setShowRating] = useState(false);

  const ratingKey = `event:${event.id}`;
  const { averageRating, totalRatings } = useRating(ratingKey);

  const handleToggleComments = () => {
    setShowComments(!showComments);
  };

  const handleToggleRating = () => {
    setShowRating(!showRating);
  };

  const displayRating = averageRating ? (averageRating * 5).toFixed(1) : null;

  return (
    <Card>
      <CardContent sx={{ "&:last-child": { pb: 1.5 }, pt: 1.5, px: 2 }}>
        {/* Single row of all action icons */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <CommentTrigger
            eventId={event.id}
            showComments={showComments}
            onToggleComments={handleToggleComments}
          />

          <Box display="flex" alignItems="center">
            <Likes pollEvent={event} />
          </Box>

          <RepostButton event={event} />

          <ShareButton event={event} />

          <Zap pollEvent={event} />

          {/* Rating icon - compact, inline with others */}
          <Box
            display="flex"
            alignItems="center"
            sx={{ ml: 2, cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleRating();
            }}
          >
            <IconButton
              size="small"
              sx={{ p: 0.25 }}
              color={showRating ? "primary" : "default"}
            >
              {totalRatings ? (
                <StarIcon
                  sx={{
                    fontSize: 22,
                    color: "#FAD13F",
                    transition: "transform 0.2s ease",
                    transform: showRating ? "scale(1.2)" : "scale(1)",
                  }}
                />
              ) : (
                <StarBorderIcon
                  sx={{
                    fontSize: 22,
                    transition: "transform 0.2s ease",
                    transform: showRating ? "scale(1.2)" : "scale(1)",
                  }}
                />
              )}
            </IconButton>
            {displayRating && (
              <Grow in>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.25, fontWeight: 500, fontSize: "0.7rem" }}
                >
                  {displayRating}
                </Typography>
              </Grow>
            )}
          </Box>
        </Box>

        {/* Rating panel - slides open below the icon row */}
        <Collapse in={showRating} timeout={250} unmountOnExit>
          <Box
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <Rate entityId={event.id} entityType="event" />
          </Box>
        </Collapse>

        {/* Comment section - slides open below */}
        <Collapse in={showComments} timeout={250} unmountOnExit>
          <Box
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <CommentSection
              eventId={event.id}
              showComments={showComments}
            />
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};
