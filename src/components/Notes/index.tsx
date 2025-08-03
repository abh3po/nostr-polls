import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Menu,
  Snackbar,
  MenuItem,
  Box,
  IconButton,
} from "@mui/material";
import { Event, nip19 } from "nostr-tools";
import { TextWithImages } from "../Common/Parsers/TextWithImages";
import { useEffect, useRef, useState } from "react";
import { useAppContext } from "../../hooks/useAppContext";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import { openProfileTab } from "../../nostr";
import { calculateTimeAgo } from "../../utils/common";
import { PrepareNote } from "./PrepareNote";
import { FeedbackMenu } from "../FeedbackMenu";
import { alpha, useTheme } from "@mui/material/styles";
import { useResizeObserver } from "../../hooks/useResizeObserver";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RateEventModal from "../../components/Ratings/RateEventModal";

interface NotesProps {
  event: Event;
  extras?: React.ReactNode;
  hidden?: boolean;
  showReason?: React.ReactNode;
}

export const Notes: React.FC<NotesProps> = ({
  event,
  extras,
  hidden = false,
  showReason,
}) => {
  const { profiles, fetchUserProfileThrottled } = useAppContext();
  const referencedEventId = event.tags.find((t) => t[0] === "e")?.[1];

  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [parentEventId, setParentEventId] = useState<string | null>(null);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setMenuAnchor(event.currentTarget as HTMLElement);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  const handleCopyNevent = () => {
    const nevent = nip19.neventEncode({ id: event.id });
    navigator.clipboard.writeText(nevent).then(() => {
      setSnackbarOpen(true);
    });
    handleCloseMenu();
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

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
  }, [event.pubkey, profiles]);

  useResizeObserver(contentRef, checkOverflow);

  const timeAgo = calculateTimeAgo(event.created_at);

  return (
    <>
      {hidden ? (
        <Card
          variant="outlined"
          sx={{
            m: 1,
            p: 2,
            border: "1px dashed #aaa",
          }}
        >
          {showReason || (
            <Typography variant="body2">
              This note has been marked as off-topic or muted.
            </Typography>
          )}
        </Card>
      ) : (
        <Card
          variant="outlined"
          className="poll-response-form"
          sx={{
            m: 1,
            opacity: hidden ? 0.5 : 1,
            pointerEvents: hidden ? "auto" : "auto",
          }}
          onContextMenu={handleContextMenu}
        >
          {referencedEventId && (
            <Button
              variant="text"
              size="small"
              sx={{ ml: 2, mt: 1 }}
              onClick={() => {
                setParentEventId(referencedEventId);
                setParentModalOpen(true);
              }}
            >
              View Parent
            </Button>
          )}

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
            action={
              <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
                <MoreVertIcon />
              </IconButton>
            }
            subheader={timeAgo}
            sx={{ m: 0, pl: 2, pt: 1 }}
          />

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleCloseMenu}
          >
            <MenuItem onClick={handleCopyNevent}>Copy event Id</MenuItem>
            {extras}
          </Menu>

          <Snackbar
            open={snackbarOpen}
            autoHideDuration={2000}
            onClose={handleCloseSnackbar}
            message="Copied nevent to clipboard"
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
                  <Typography sx={{ fontSize: 10, mt: 1 }}>
                    replying to:
                  </Typography>
                  <div style={{ borderRadius: "2px", borderColor: "grey" }}>
                    <PrepareNote eventId={referencedEventId} />
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
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      backdropFilter: "blur(6px)",
                      paddingBottom: 8,
                      pointerEvents: "auto",
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
      )}

      <RateEventModal
        open={parentModalOpen}
        onClose={() => {
          setParentModalOpen(false);
          setParentEventId(null);
        }}
        initialEventId={parentEventId}
      />
    </>
  );
};
