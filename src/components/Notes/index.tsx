import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
} from "@mui/material";
import { Event, nip19 } from "nostr-tools";
import { TextWithImages } from "../Common/TextWithImages";
import { useEffect, useRef, useState } from "react";
import { useAppContext } from "../../hooks/useAppContext";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import { openProfileTab } from "../../nostr";
import { calculateTimeAgo } from "../../utils/common";
import { PrepareNote } from "./PrepareNote";
import { FeedbackMenu } from "../FeedbackMenu";
import { alpha, useTheme } from "@mui/material/styles";

interface NotesProps {
  event: Event;
}

export const Notes: React.FC<NotesProps> = ({ event }) => {
  const { profiles, fetchUserProfileThrottled } = useAppContext();
  const referencedEventId = event.tags.find((t) => t[0] === "e")?.[1];

  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const subtleGradient = `linear-gradient(
  to bottom,
  rgba(255,255,255,0),
  ${alpha(primaryColor, 0.6)} 100%
)`;

  const checkOverflow = () => {
    const el = contentRef.current;
    if (el) {
      setIsOverflowing(el.scrollHeight > el.clientHeight);
    }
  };

  useEffect(() => {
    if (!profiles?.has(event.pubkey)) {
      fetchUserProfileThrottled(event.pubkey);
    }
  }, [event, fetchUserProfileThrottled, profiles]);

  useEffect(() => {
    checkOverflow();
  }, [event]);

  const timeAgo = calculateTimeAgo(event.created_at);

  return (
    <Card variant="outlined" className="poll-response-form" sx={{ m: 1 }}>
      <CardHeader
        avatar={
          <Avatar
            src={profiles?.get(event.pubkey)?.picture || DEFAULT_IMAGE_URL}
            onClick={() => openProfileTab(nip19.npubEncode(event.pubkey))}
            sx={{ cursor: "pointer" }}
          />
        }
        title={
          profiles?.get(event.pubkey)?.name ||
          profiles?.get(event.pubkey)?.username ||
          profiles?.get(event.pubkey)?.nip05 ||
          nip19.npubEncode(event.pubkey).slice(0, 10) + "..."
        }
        titleTypographyProps={{
          fontSize: 18,
          fontWeight: "bold",
        }}
        subheader={timeAgo}
        sx={{ m: 0, pl: 2, pt: 1 }}
      />
      <Card variant="outlined" sx={{ position: "relative" }}>
        <CardContent
          ref={contentRef}
          sx={{
            position: "relative",
            overflow: isExpanded ? "visible" : "hidden",
            maxHeight: isExpanded ? "none" : 200,
            transition: "max-height 0.3s ease",
            p: 2,
          }}
        >
          <TextWithImages content={event.content} />
          {referencedEventId && (
            <>
              <Typography sx={{ fontSize: 10 }}>replying to:</Typography>
              <div style={{ borderRadius: "2px", borderColor: "grey" }}>
                <PrepareNote
                  eventId={referencedEventId}
                  onReady={checkOverflow}
                />
              </div>
            </>
          )}
          {!isExpanded && isOverflowing && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: "60px",
                background: subtleGradient,
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
                pointerEvents: "none", // Allows clicks to go through
              }}
            >
              <div
                style={{
                  backdropFilter: "blur(6px)",
                  paddingBottom: 8,
                  pointerEvents: "auto", // Only button is clickable
                }}
              >
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setIsExpanded(true)}
                >
                  See more
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <FeedbackMenu event={event} />
    </Card>
  );
};
