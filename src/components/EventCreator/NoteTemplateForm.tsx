import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Collapse,
  Typography,
  Chip,
} from "@mui/material";
import { useNotification } from "../../contexts/notification-context";
import { useUserContext } from "../../hooks/useUserContext";
import { useNavigate } from "react-router-dom";
import { NOTIFICATION_MESSAGES } from "../../constants/notifications";
import { NOSTR_EVENT_KINDS } from "../../constants/nostr";
import { signEvent } from "../../nostr";
import { useRelays } from "../../hooks/useRelays";
import { Event } from "nostr-tools";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { NotePreview } from "./NotePreview";
import { pool } from "../../singletons";

const NoteTemplateForm: React.FC<{
  eventContent: string;
  setEventContent: (val: string) => void;
}> = ({ eventContent, setEventContent }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const { showNotification } = useNotification();
  const { user } = useUserContext();
  const { relays } = useRelays();
  const navigate = useNavigate();

  // Extract hashtags like #example from the text
  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.matchAll(hashtagRegex);
    return Array.from(new Set(Array.from(matches, (m) => m[1].toLowerCase())));
  };

  // Update topics whenever eventContent changes
  useEffect(() => {
    setTopics(extractHashtags(eventContent));
  }, [eventContent]);

  const previewEvent: Partial<Event> = {
    content: eventContent,
    tags: topics.map((tag) => ["t", tag]),
  };

  const publishNoteEvent = async (secret?: string) => {
    try {
      if (!eventContent.trim()) {
        showNotification(NOTIFICATION_MESSAGES.EMPTY_NOTE_CONTENT, "error");
        return;
      }
      const noteEvent = {
        kind: NOSTR_EVENT_KINDS.TEXT_NOTE,
        content: eventContent,
        tags: [
          ...relays.map((relay) => ["relay", relay]),
          ...topics.map((tag) => ["t", tag]),
        ],
        created_at: Math.floor(Date.now() / 1000),
      };
      setIsSubmitting(true);
      const signedEvent = await signEvent(noteEvent, user?.privateKey);
      setIsSubmitting(false);
      if (!signedEvent) {
        showNotification(NOTIFICATION_MESSAGES.NOTE_SIGN_FAILED, "error");
        return;
      }
      pool.publish(relays, signedEvent);
      showNotification(NOTIFICATION_MESSAGES.NOTE_PUBLISHED_SUCCESS, "success");
      navigate("/feeds/notes");
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error publishing note:", error);
      showNotification(NOTIFICATION_MESSAGES.NOTE_PUBLISH_FAILED, "error");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    publishNoteEvent(user?.privateKey);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={4}>
        <Box>
          <TextField
            label="Note Content"
            value={eventContent}
            onChange={(e) => setEventContent(e.target.value)}
            required
            multiline
            minRows={4}
            maxRows={8}
            fullWidth
            placeholder="Share your thoughts. Use #hashtags to tag topics."
          />
        </Box>

        {topics.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Topics
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {topics.map((topic, index) => (
                <Chip
                  key={index}
                  label={`#${topic}`}
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}

        <Box sx={{ pt: 2 }}>
          <Box display="flex" flexDirection="column" gap={2}>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? "Creating Note..." : "Create Note"}
            </Button>
            <Button
              variant="outlined"
              startIcon={
                showPreview ? <VisibilityOffIcon /> : <VisibilityIcon />
              }
              onClick={(e) => {
                e.preventDefault();
                setShowPreview(!showPreview);
              }}
              fullWidth
            >
              {showPreview ? "Hide Preview" : "Show Preview"}
            </Button>
            <Collapse in={showPreview}>
              <Box mt={1}>
                <NotePreview noteEvent={previewEvent} />
              </Box>
            </Collapse>
          </Box>
        </Box>
      </Stack>
    </form>
  );
};

export default NoteTemplateForm;
