import React, { useState } from "react";
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  ListItemText,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useNostrNotifications } from "../../contexts/nostr-notification-context";

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAllAsRead } = useNostrNotifications();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    markAllAsRead(); // mark everything as read when opening panel
  };

  const handleClose = () => setAnchorEl(null);

  const sorted = Array.from(notifications.values()).sort(
    (a, b) => b.created_at - a.created_at
  );

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen} sx={{ mr: 1 }}>
        <Badge
          badgeContent={unreadCount}
          color="primary" // ⭐ uses your theme primary color
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
          sx: {
            width: 320,
            maxHeight: 400,
          },
        }}
      >
        {sorted.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </MenuItem>
        )}

        {sorted.map((ev) => (
          <MenuItem key={ev.id} onClick={handleClose}>
            <ListItemText
              primary={ev.kind === 1018 ? "New poll response" : "New event"}
              secondary={
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(ev.created_at * 1000).toLocaleString()}
                  </Typography>
                </Box>
              }
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
