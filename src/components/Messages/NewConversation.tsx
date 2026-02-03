import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  InputAdornment,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { useAppContext } from "../../hooks/useAppContext";
import { useUserContext } from "../../hooks/useUserContext";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";

const NewConversation: React.FC = () => {
  const navigate = useNavigate();
  const { profiles } = useAppContext();
  const { user } = useUserContext();
  const [search, setSearch] = useState("");

  const handleSubmit = () => {
    const input = search.trim();
    if (!input) return;

    try {
      // Try to decode as npub or nprofile
      if (input.startsWith("npub1") || input.startsWith("nprofile1")) {
        const decoded = nip19.decode(input);
        let pubkey: string;
        if (decoded.type === "npub") {
          pubkey = decoded.data;
        } else if (decoded.type === "nprofile") {
          pubkey = decoded.data.pubkey;
        } else {
          return;
        }
        navigate(`/messages/${nip19.npubEncode(pubkey)}`);
        return;
      }

      // Try as raw hex pubkey
      if (/^[0-9a-f]{64}$/i.test(input)) {
        navigate(`/messages/${nip19.npubEncode(input)}`);
        return;
      }
    } catch (e) {
      console.error("Invalid input:", e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Show contacts from follows
  const contacts: { pubkey: string; name: string; picture: string }[] = [];
  if (user?.follows) {
    for (const pubkey of user.follows) {
      if (pubkey === user.pubkey) continue;
      const profile = profiles?.get(pubkey);
      const name =
        profile?.display_name ||
        profile?.name ||
        nip19.npubEncode(pubkey).slice(0, 12) + "...";
      const picture = profile?.picture || DEFAULT_IMAGE_URL;

      // Filter by search
      if (
        search &&
        !name.toLowerCase().includes(search.toLowerCase()) &&
        !pubkey.includes(search.toLowerCase())
      ) {
        continue;
      }

      contacts.push({ pubkey, name, picture });
    }
  }

  return (
    <Box maxWidth={800} mx="auto" px={2} py={2}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconButton onClick={() => navigate("/messages")} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">New Message</Typography>
      </Box>

      <TextField
        fullWidth
        size="small"
        placeholder="Enter npub, nprofile, or hex pubkey..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {contacts.length > 0 && (
        <>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Contacts
          </Typography>
          <List disablePadding>
            {contacts.map((c) => (
              <ListItem
                key={c.pubkey}
                onClick={() =>
                  navigate(`/messages/${nip19.npubEncode(c.pubkey)}`)
                }
                sx={{
                  cursor: "pointer",
                  borderRadius: 2,
                  mb: 0.5,
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar src={c.picture} />
                </ListItemAvatar>
                <ListItemText primary={c.name} />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {contacts.length === 0 && user?.follows && search && (
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          py={4}
        >
          No contacts found. Paste an npub or hex pubkey and press Enter.
        </Typography>
      )}

      {!user?.follows && (
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          py={4}
        >
          Paste an npub, nprofile, or hex pubkey above and press Enter.
        </Typography>
      )}
    </Box>
  );
};

export default NewConversation;
