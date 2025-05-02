import React, { useState } from "react";
import {
  Box,
  Button,
  Modal,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import { nip19, SimplePool, Event } from "nostr-tools";
import EventJsonCard from "./EventJSONCard";
import { defaultRelays } from "../../nostr";
import { Notes } from "../Notes";

interface Props {
  open: boolean;
  onClose: () => void;
}

const RateEventModal: React.FC<Props> = ({ open, onClose }) => {
  const [input, setInput] = useState("");
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setInput("");
    setEvent(null);
    setLoading(false);
    setError(null);
    onClose();
  };

  const fetchEvent = async () => {
    try {
      setError(null);
      setLoading(true);
      const decoded = nip19.decode(input.trim());

      if (decoded.type !== "nevent" || !decoded.data?.id) {
        setError("Invalid nevent format.");
        setLoading(false);
        return;
      }

      const pool = new SimplePool();
      const ev = await pool.get(defaultRelays, {
        ids: [decoded.data.id],
      });

      if (!ev) {
        setError("Event not found.");
      } else {
        setEvent(ev);
      }

      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError("Failed to decode or fetch event.");
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          p: 4,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          maxWidth: 600,
          mx: "auto",
          mt: "10%",
        }}
      >
        <Typography variant="h6" mb={2}>
          Rate a Nostr Event
        </Typography>

        {!event && (
          <>
            <TextField
              fullWidth
              label="nevent1..."
              variant="outlined"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="nevent1..."
              sx={{ mb: 2 }}
            />
            <Button variant="contained" fullWidth onClick={fetchEvent}>
              {loading ? <CircularProgress size={24} /> : "Load Event"}
            </Button>
            {error && (
              <Typography color="error" mt={2}>
                {error}
              </Typography>
            )}
          </>
        )}

        {event && (
          <>
            {event.kind === 1 ? (
              <Notes event={event} />
            ) : (
              <EventJsonCard event={event} />
            )}
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

export default RateEventModal;
