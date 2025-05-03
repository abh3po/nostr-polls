import React, { useState } from "react";
import {
  Box,
  Button,
  Modal,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import { nip19, Event, SimplePool } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import ProfileCard from "../Profile/ProfileCard";

interface RateProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const RateProfileModal: React.FC<RateProfileModalProps> = ({
  open,
  onClose,
}) => {
  const [npubInput, setNpubInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Event | null>(null);

  const handleNpubSubmit = async () => {
    setLoading(true);
    try {
      const { data: pubkey } = nip19.decode(npubInput);
      const pool = new SimplePool();

      const sub = pool.subscribeMany(
        defaultRelays,
        [
          {
            kinds: [0],
            authors: [pubkey as string],
            limit: 1,
          },
        ],
        {
          onevent: (event) => {
            setProfile(event);
            setLoading(false);
            sub.close();
          },
          oneose: () => {
            setLoading(false);
            sub.close();
          },
        }
      );
    } catch (e) {
      alert("Invalid npub.");
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProfile(null);
    setNpubInput("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          p: 4,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          maxWidth: 500,
          mx: "auto",
          mt: "10%",
        }}
      >
        <Typography variant="h6" mb={2}>
          Rate a Profile
        </Typography>

        {!profile ? (
          <>
            <TextField
              fullWidth
              label="npub"
              variant="outlined"
              value={npubInput}
              onChange={(e) => setNpubInput(e.target.value)}
              sx={{ mb: 2 }}
              disabled={loading}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={handleNpubSubmit}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Load Profile"}
            </Button>
          </>
        ) : (
          <>
            <ProfileCard event={profile} />
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleClose}
            >
              Close
            </Button>
          </>
        )}
      </Box>
    </Modal>
  );
};

export default RateProfileModal;
