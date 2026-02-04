import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  InputAdornment,
  IconButton,
  Box,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { useAppContext } from "../../hooks/useAppContext";
import { useUserContext } from "../../hooks/useUserContext";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";

interface ContactSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (pubkey: string) => void;
  title?: string;
}

const ContactSearchDialog: React.FC<ContactSearchDialogProps> = ({
  open,
  onClose,
  onSelect,
  title = "Send to...",
}) => {
  const { profiles, fetchUserProfileThrottled } = useAppContext();
  const { user } = useUserContext();
  const [search, setSearch] = useState("");

  const contacts = useMemo(() => {
    if (!user?.follows) return [];

    return user.follows
      .filter((pubkey) => pubkey !== user.pubkey)
      .map((pubkey) => {
        const profile = profiles?.get(pubkey);
        if (!profile) {
          fetchUserProfileThrottled(pubkey);
        }
        return {
          pubkey,
          name: profile?.display_name || profile?.name || "",
          nip05: profile?.nip05 || "",
          picture: profile?.picture || DEFAULT_IMAGE_URL,
        };
      });
  }, [user, profiles, fetchUserProfileThrottled]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nip05.toLowerCase().includes(q) ||
        c.pubkey.startsWith(q)
    );
  }, [contacts, search]);

  const handleSelect = (pubkey: string) => {
    onSelect(pubkey);
    setSearch("");
    onClose();
  };

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { maxHeight: "70vh" } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        {title}
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 2, pt: 0 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by name or NIP-05..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          sx={{ mb: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {filtered.length === 0 ? (
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary">
              {contacts.length === 0
                ? "No contacts found. Follow people to see them here."
                : "No matches found."}
            </Typography>
          </Box>
        ) : (
          <List disablePadding dense>
            {filtered.map((c) => (
              <ListItem
                key={c.pubkey}
                onClick={() => handleSelect(c.pubkey)}
                sx={{
                  cursor: "pointer",
                  borderRadius: 1.5,
                  mb: 0.5,
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <ListItemAvatar>
                  <Avatar src={c.picture} sx={{ width: 36, height: 36 }} />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={500}>
                      {c.name || c.pubkey.slice(0, 12) + "..."}
                    </Typography>
                  }
                  secondary={c.nip05 || undefined}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContactSearchDialog;
