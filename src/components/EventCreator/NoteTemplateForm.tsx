import React, { useState } from "react";
import { Box, Button, Stack, TextField } from "@mui/material";
import { useSigner } from "../../contexts/signer-context";
import { useNotification } from "../../contexts/notification-context";
import { useAppContext } from "../../hooks/useAppContext";
import { useUserContext } from "../../hooks/useUserContext";
import { useNavigate } from "react-router-dom";
import { NOTIFICATION_MESSAGES } from "../../constants/notifications";
import { NOSTR_EVENT_KINDS } from "../../constants/nostr";
import { defaultRelays, signEvent } from "../../nostr";

const NoteTemplateForm: React.FC<{ eventContent: string; setEventContent: (val: string) => void }> = ({ eventContent, setEventContent }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signer, requestLogin } = useSigner();
  const { showNotification } = useNotification();
  const { poolRef } = useAppContext();
  const { user } = useUserContext();
  const navigate = useNavigate();

  const publishNoteEvent = async (secret?: string) => {
    try {
      if (!signer && !secret) {
        requestLogin();
        return;
      }
      if (!eventContent.trim()) {
        showNotification(NOTIFICATION_MESSAGES.EMPTY_NOTE_CONTENT, "error");
        return;
      }
      const noteEvent = {
        kind: NOSTR_EVENT_KINDS.TEXT_NOTE,
        content: eventContent,
        tags: [
          ...defaultRelays.map((relay) => ["relay", relay]),
        ],
        created_at: Math.floor(Date.now() / 1000),
      };
      setIsSubmitting(true);
      const signedEvent = await signEvent(noteEvent, signer, user?.privateKey);
      setIsSubmitting(false);
      if (!signedEvent) {
        showNotification(NOTIFICATION_MESSAGES.NOTE_SIGN_FAILED, "error");
        return;
      }
      poolRef.current.publish(defaultRelays, signedEvent);
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
            placeholder="Share your thoughts."
          />
        </Box>
        <Box sx={{ pt: 2 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Note..." : "Create Note"}
          </Button>
        </Box>
      </Stack>
    </form>
  );
};

export default NoteTemplateForm;
