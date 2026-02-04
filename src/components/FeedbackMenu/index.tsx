import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  Collapse,
  Box,
  IconButton,
  Typography,
  Grow,
  Fade,
} from "@mui/material";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
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
  depth?: number;
}

const MAX_DEPTH = 2;

export const FeedbackMenu: React.FC<FeedbackMenuProps> = ({
  event,
  depth = 0,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ratingKey = `event:${event.id}`;
  const { averageRating, totalRatings } = useRating(ratingKey);

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 2);
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [checkOverflow]);

  const handleScrollLeft = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: -120, behavior: "smooth" });
  };

  const handleScrollRight = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: 120, behavior: "smooth" });
  };

  const handleScroll = () => {
    checkOverflow();
  };

  const handleToggleComments = () => {
    setShowComments(!showComments);
  };

  const handleToggleRating = () => {
    setShowRating(!showRating);
  };

  const displayRating = averageRating ? (averageRating * 5).toFixed(1) : null;
  const isNested = depth > 0;

  return (
    <Card
      variant={isNested ? "outlined" : "elevation"}
      elevation={isNested ? 0 : 1}
    >
      <CardContent
        sx={{
          "&:last-child": { pb: isNested ? 1 : 1.5 },
          pt: isNested ? 1 : 1.5,
          px: isNested ? 1.5 : 2,
        }}
      >
        {/* Scrollable icon row with overflow indicator */}
        <Box position="relative">
          <Box
            ref={scrollRef}
            onScroll={handleScroll}
            display="flex"
            alignItems="center"
            gap={1}
            sx={{
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              "& > *": { flexShrink: 0 },
              ...(isNested ? { "& svg": { fontSize: "18px !important" } } : {}),
            }}
          >
            {depth < MAX_DEPTH && (
              <CommentTrigger
                eventId={event.id}
                showComments={showComments}
                onToggleComments={handleToggleComments}
              />
            )}

            <Box display="flex" alignItems="center">
              <Likes pollEvent={event} />
            </Box>

            <RepostButton event={event} />

            <ShareButton event={event} />

            <Zap pollEvent={event} />

            {/* Rating icon */}
            <Box
              display="flex"
              alignItems="center"
              sx={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleRating();
              }}
            >
              <IconButton
                size="small"
                sx={{ p: 0.25, padding: 2 }}
                // color={showRating ? "primary" : "default"}
              >
                {totalRatings ? (
                  <StarBorderIcon
                    sx={{
                      fontSize: "22px !important",
                      transition: "transform 0.2s ease",
                      transform: showRating ? "scale(1.2)" : "scale(1)",
                      color: "#FAD13F",
                    }}
                  />
                ) : (
                  <StarBorderIcon
                    sx={{
                      fontSize: "22px !important",
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
                    sx={{ fontWeight: 500, fontSize: "0.7rem" }}
                  >
                    {displayRating}
                  </Typography>
                </Grow>
              )}
            </Box>
          </Box>

          {/* Scroll-left indicator */}
          <Fade in={canScrollLeft}>
            <Box
              onClick={handleScrollLeft}
              sx={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                background: (theme) =>
                  `linear-gradient(to left, transparent, ${
                    theme.palette.mode === "dark"
                      ? theme.palette.background.paper
                      : theme.palette.background.paper
                  } 60%)`,
                pr: 2,
                pl: 0.25,
                pointerEvents: canScrollLeft ? "auto" : "none",
              }}
            >
              <ChevronLeftIcon
                sx={{
                  fontSize: 20,
                  color: "text.secondary",
                  opacity: 0.7,
                }}
              />
            </Box>
          </Fade>

          {/* Scroll-right indicator */}
          <Fade in={canScrollRight}>
            <Box
              onClick={handleScrollRight}
              sx={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                // Gradient fade from transparent to card background
                background: (theme) =>
                  `linear-gradient(to right, transparent, ${
                    theme.palette.mode === "dark"
                      ? theme.palette.background.paper
                      : theme.palette.background.paper
                  } 60%)`,
                pl: 2,
                pr: 0.25,
                pointerEvents: canScrollRight ? "auto" : "none",
              }}
            >
              <ChevronRightIcon
                sx={{
                  fontSize: 20,
                  color: "text.secondary",
                  opacity: 0.7,
                }}
              />
            </Box>
          </Fade>
        </Box>

        {/* Rating panel */}
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

        {/* Comment section */}
        {depth < MAX_DEPTH && (
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
                depth={depth}
              />
            </Box>
          </Collapse>
        )}
      </CardContent>
    </Card>
  );
};
