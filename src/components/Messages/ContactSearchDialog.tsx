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
  Button,
  Checkbox,
  CircularProgress,
  AvatarGroup,
  DialogActions,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import { useAppContext } from "../../hooks/useAppContext";
import { useUserContext } from "../../hooks/useUserContext";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";

interface Contact {
  pubkey: string;
  name: string;
  nip05: string;
  picture: string;
}

interface ContactSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (pubkeys: string[], message?: string) => Promise<void>;
  title?: string;
  showMessageStep?: boolean;
}

const ContactSearchDialog: React.FC<ContactSearchDialogProps> = ({
  open,
  onClose,
  onSelect,
  title = "Send to...",
  showMessageStep = false,
}) => {
  const { profiles, fetchUserProfileThrottled } = useAppContext();
  const { user } = useUserContext();
  const [search, setSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"pick" | "compose">("pick");
  const [sending, setSending] = useState(false);

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

  const isSelected = (pubkey: string) =>
    selectedContacts.some((c) => c.pubkey === pubkey);

  const toggleContact = (contact: Contact) => {
    setSelectedContacts((prev) =>
      prev.some((c) => c.pubkey === contact.pubkey)
        ? prev.filter((c) => c.pubkey !== contact.pubkey)
        : [...prev, contact]
    );
  };

  const handleNext = () => {
    if (showMessageStep) {
      setStep("compose");
    } else {
      handleSend();
    }
  };

  const handleSend = async () => {
    if (selectedContacts.length === 0) return;
    setSending(true);
    try {
      const trimmed = message.trim();
      await onSelect(
        selectedContacts.map((c) => c.pubkey),
        trimmed || undefined
      );
      resetAndClose();
    } catch {
      setSending(false);
    }
  };

  const handleBack = () => {
    setStep("pick");
    setMessage("");
  };

  const resetAndClose = () => {
    setSearch("");
    setMessage("");
    setSelectedContacts([]);
    setStep("pick");
    setSending(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={sending ? undefined : resetAndClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { maxHeight: "70vh" } }}
    >
      {step === "compose" ? (
        <>
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pb: 1,
            }}
          >
            <IconButton
              onClick={handleBack}
              size="small"
              sx={{ mr: 1 }}
              disabled={sending}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                gap: 1,
                overflow: "hidden",
              }}
            >
              <AvatarGroup max={4} sx={{ "& .MuiAvatar-root": { width: 28, height: 28, fontSize: 12 } }}>
                {selectedContacts.map((c) => (
                  <Avatar key={c.pubkey} src={c.picture} />
                ))}
              </AvatarGroup>
              <Typography variant="body2" fontWeight={500} noWrap>
                {selectedContacts.length === 1
                  ? selectedContacts[0].name || selectedContacts[0].pubkey.slice(0, 12) + "..."
                  : `${selectedContacts.length} people`}
              </Typography>
            </Box>
            <IconButton onClick={resetAndClose} size="small" disabled={sending}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ px: 2, pt: 0 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Add a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
              multiline
              maxRows={4}
              disabled={sending}
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleSend}
              disabled={sending}
              endIcon={
                sending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <SendIcon />
                )
              }
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </DialogContent>
        </>
      ) : (
        <>
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pb: 1,
            }}
          >
            {title}
            <IconButton onClick={resetAndClose} size="small">
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
                    onClick={() => toggleContact(c)}
                    sx={{
                      cursor: "pointer",
                      borderRadius: 1.5,
                      mb: 0.5,
                      "&:hover": { backgroundColor: "action.hover" },
                    }}
                  >
                    <Checkbox
                      checked={isSelected(c.pubkey)}
                      size="small"
                      sx={{ mr: 0.5, p: 0.5 }}
                      tabIndex={-1}
                      disableRipple
                    />
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
          {selectedContacts.length > 0 && (
            <DialogActions sx={{ px: 2, pb: 2 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleNext}
              >
                {showMessageStep
                  ? `Next (${selectedContacts.length})`
                  : `Send (${selectedContacts.length})`}
              </Button>
            </DialogActions>
          )}
        </>
      )}
    </Dialog>
  );
};

export default ContactSearchDialog;
