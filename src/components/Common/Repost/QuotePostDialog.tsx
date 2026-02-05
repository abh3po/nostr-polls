import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Paper,
  Typography,
} from "@mui/material";
import { Event, nip19 } from "nostr-tools";
import { useUserContext } from "../../../hooks/useUserContext";
import { useRelays } from "../../../hooks/useRelays";
import { useNotification } from "../../../contexts/notification-context";
import { signEvent } from "../../../nostr";
import { pool } from "../../../singletons";
import { NOSTR_EVENT_KINDS } from "../../../constants/nostr";
import MentionTextArea, {
  extractMentionTags,
} from "../../EventCreator/MentionTextArea";
import { PrepareNote } from "../../Notes/PrepareNote";

interface QuotePostDialogProps {
  open: boolean;
  onClose: () => void;
  event: Event;
}

const QuotePostDialog: React.FC<QuotePostDialogProps> = ({
  open,
  onClose,
  event,
}) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUserContext();
  const { relays } = useRelays();
  const { showNotification } = useNotification();

  const neventId = nip19.neventEncode({
    id: event.id,
    relays: relays.slice(0, 2),
    kind: event.kind,
  });

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.matchAll(hashtagRegex);
    return Array.from(new Set(Array.from(matches, (m) => m[1].toLowerCase())));
  };

  const handleSubmit = async () => {
    if (!user) return;

    const fullContent = content.trim()
      ? `${content}\n\nnostr:${neventId}`
      : `nostr:${neventId}`;

    const mentionTags = extractMentionTags(content);
    const hashtagTags = extractHashtags(content).map((t) => ["t", t]);

    const noteEvent = {
      kind: NOSTR_EVENT_KINDS.TEXT_NOTE,
      content: fullContent,
      tags: [
        ["q", event.id, relays[0] || ""],
        ["p", event.pubkey],
        ...mentionTags,
        ...hashtagTags,
      ],
      created_at: Math.floor(Date.now() / 1000),
    };

    try {
      setIsSubmitting(true);
      const signedEvent = await signEvent(noteEvent, user.privateKey);
      if (!signedEvent) {
        showNotification("Failed to sign quote post", "error");
        return;
      }
      pool.publish(relays, signedEvent);
      showNotification("Quote post published!", "success");
      setContent("");
      onClose();
    } catch (error) {
      console.error("Error publishing quote post:", error);
      showNotification("Failed to publish quote post", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setContent("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Quote Post</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <MentionTextArea
            label="Add your commentary"
            value={content}
            onChange={setContent}
            placeholder="Write something about this post..."
            minRows={3}
            maxRows={6}
          />
        </Box>
        <Paper
          variant="outlined"
          sx={{
            mt: 2,
            p: 1,
            maxHeight: 300,
            overflow: "auto",
            opacity: 0.85,
            pointerEvents: "none",
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            Quoting:
          </Typography>
          <PrepareNote neventId={neventId} />
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Publishing..." : "Quote Post"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuotePostDialog;
