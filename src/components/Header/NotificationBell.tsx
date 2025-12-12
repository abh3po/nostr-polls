import React, { useState } from "react";
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  ListItemText,
  Divider,
  Avatar,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useNostrNotifications } from "../../contexts/nostr-notification-context";
import { parseNotification } from "./notification-utils";
import { useAppContext } from "../../hooks/useAppContext";
import { Event, nip19 } from "nostr-tools";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import { useNavigate } from "react-router-dom";

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAllAsRead, pollMap } =
    useNostrNotifications();
  const { profiles, fetchUserProfileThrottled } = useAppContext();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const sorted = Array.from(notifications.values()).sort(
    (a, b) => b.created_at - a.created_at
  );

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    markAllAsRead();
  };

  const handleNotificationClick = (parsed: any) => {
    // Poll responses → go to poll response page
    if (parsed.type === "poll-response" && parsed.pollId) {
      navigate(`/respond/${parsed.pollId}`);
      return;
    }

    // Comments, reactions, likes, zaps → note thread
    if (parsed.postId) {
      navigate(`/note/${parsed.postId}`);
      return;
    }

    // fallback: do nothing
  };

  const handleClose = () => setAnchorEl(null);

  // -------------------------------
  // UTIL: resolve profile name
  // -------------------------------
  const getName = (pubkey: string | null) => {
    if (!pubkey) return "Someone";

    // Load profile if missing
    if (!profiles?.get(pubkey)) {
      fetchUserProfileThrottled(pubkey);
    }

    const meta = profiles?.get(pubkey);
    return (
      meta?.display_name || meta?.name || nip19.npubEncode(pubkey).slice(0, 8)
    );
  };

  // -------------------------------
  // UTIL: avatar
  // -------------------------------
  const getAvatar = (pubkey: string | null) => {
    if (!pubkey) return DEFAULT_IMAGE_URL;
    const meta = profiles?.get(pubkey);

    if (!meta) {
      fetchUserProfileThrottled(pubkey);
      return DEFAULT_IMAGE_URL;
    }

    return meta.picture || DEFAULT_IMAGE_URL;
  };

  // -------------------------------
  // NOTIFICATION TEXT BUILDER
  // -------------------------------
  const renderItem = (ev: Event) => {
    const parsed = parseNotification(ev);
    const name = getName(parsed.fromPubkey);

    // Fallback snippet
    const snippet = ev.content?.slice(0, 80) || "";

    switch (parsed.type) {
      case "poll-response":
        return {
          title: `${name} responded to your poll`,
          body: pollMap.get(parsed.pollId!)?.content
            ? `"${pollMap.get(parsed.pollId!)?.content.slice(0, 80)}"`
            : "(no answer)",
        };

      case "comment":
        return {
          title: `${name} commented`,
          body: parsed.content
            ? `"${parsed.content.slice(0, 80)}"`
            : "(no text)",
        };

      case "reaction":
        return {
          title: `${name} reacted ${parsed.reaction}`,
          body: parsed.postId
            ? `To your post ${parsed.postId.slice(0, 8)}…`
            : "",
        };

      case "zap":
        return {
          title: `${name} zapped you ⚡`,
          body: parsed.sats ? `${parsed.sats} sats` : "Zap received",
        };

      default:
        return {
          title: "New event",
          body: snippet,
        };
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen} sx={{ mr: 1 }}>
        <Badge
          badgeContent={unreadCount}
          color="primary"
          invisible={unreadCount === 0}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 350, maxHeight: 420 },
        }}
      >
        {sorted.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </MenuItem>
        )}

        {sorted.map((ev) => {
          const { title, body } = renderItem(ev);
          const parsed = parseNotification(ev);

          return (
            <Box key={ev.id}>
              <MenuItem
                onClick={() => {
                  handleClose();
                  const parsed = parseNotification(ev);
                  handleNotificationClick(parsed);
                }}
                sx={{ whiteSpace: "normal" }}
              >
                <Avatar
                  src={getAvatar(parsed.fromPubkey)}
                  sx={{ width: 32, height: 32, mr: 1 }}
                />

                <ListItemText
                  primary={<Typography variant="subtitle2">{title}</Typography>}
                  secondary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {body}
                    </Typography>
                  }
                />
              </MenuItem>
              <Divider />
            </Box>
          );
        })}
      </Menu>
    </>
  );
};
