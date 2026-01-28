import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useUserContext } from "../../hooks/useUserContext";
import { useAppContext } from "../../hooks/useAppContext";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import { nip19 } from "nostr-tools";
import { useNavigate } from "react-router-dom";

interface ContactsModalProps {
  open: boolean;
  onClose: () => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  open,
  onClose,
}) => {
  const { user } = useUserContext();
  const { profiles, fetchUserProfileThrottled } = useAppContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && user?.follows) {
      setLoading(true);
      // Fetch profiles for all follows
      user.follows.forEach((pubkey) => {
        if (!profiles?.has(pubkey)) {
          fetchUserProfileThrottled(pubkey);
        }
      });
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.follows]);

  const handleContactClick = (pubkey: string) => {
    const npub = nip19.npubEncode(pubkey);
    navigate(`/profile/${npub}`);
    onClose();
  };

  if (!user || !user.follows) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Contacts
          <IconButton
            onClick={onClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography>Please log in to view your contacts.</Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Contacts ({user.follows.length})
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : user.follows.length === 0 ? (
          <Typography>You don't follow anyone yet.</Typography>
        ) : (
          <List>
            {user.follows.map((pubkey) => {
              const profile = profiles?.get(pubkey);
              const npub = nip19.npubEncode(pubkey);
              const displayName =
                profile?.name ||
                profile?.username ||
                profile?.nip05 ||
                `${npub.slice(0, 8)}...${npub.slice(-4)}`;

              return (
                <ListItem
                  key={pubkey}
                  onClick={() => handleContactClick(pubkey)}
                  sx={{ cursor: "pointer" }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={profile?.picture || DEFAULT_IMAGE_URL}
                      alt={displayName}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={displayName}
                    secondary={profile?.nip05 || null}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};
