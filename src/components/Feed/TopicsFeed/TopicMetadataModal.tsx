// components/Topics/TopicMetadataModal.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Modal,
  TextField,
  Typography,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import { signEvent } from "../../../nostr";
import { useRelays } from "../../../hooks/useRelays";
import { Event } from "nostr-tools";
import TopicsCard from "./TopicsCard";
import { pool } from "../../../singletons";

interface Props {
  open: boolean;
  onClose: () => void;
  topic: string;
}

const TopicMetadataModal: React.FC<Props> = ({ open, onClose, topic }) => {
  const [thumb, setThumb] = useState("");
  const [description, setDescription] = useState("");
  const [tab, setTab] = useState(0);
  const [previewEvent, setPreviewEvent] = useState<Event>();
  const { relays } = useRelays();

  useEffect(() => {
    if (open) {
      buildPreviewEvent().then(setPreviewEvent);
    }
  }, [ thumb, description, open]);

  const buildTags = () => [
    ["m", "hashtag"],
    ["d", `hashtag:${topic}`],
    ...(thumb ? [["image", thumb]] : []),
    ...(description ? [["description", description]] : []),
  ];

  const buildPreviewEvent = async (): Promise<Event> => ({
    id: "temp",
    kind: 34259,
    content: topic,
    tags: buildTags(),
    created_at: Math.floor(Date.now() / 1000),
    pubkey: "preview_pubkey",
    sig: "preview_sig",
  });

  const handlePublish = async () => {
    console.log("Publishing")
    const event = {
      kind: 30300,
      content:  topic,
      tags: buildTags(),
      created_at: Math.floor(Date.now() / 1000),
    };

    const signed = await signEvent(event);
    console.log("Signed Event is", signed)
    if (!signed) return;

    pool.publish(relays, signed);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          p: 4,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          maxWidth: 600,
          mx: "auto",
          mt: "5%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography variant="h6">Add Topic Metadata</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
          Topic: <code>{topic}</code>
        </Typography>

        <Tabs value={tab} onChange={(_, val) => setTab(val)} sx={{ mb: 2 }}>
          <Tab label="Edit" />
          <Tab label="Preview" />
        </Tabs>

        {tab === 0 ? (
          <>
            <TextField
              fullWidth
              label="Thumbnail URL"
              value={thumb}
              onChange={(e) => setThumb(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button fullWidth variant="contained" onClick={handlePublish}>
                Publish
              </Button>
              <Button fullWidth variant="outlined" onClick={() => setTab(1)}>
                Preview
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Preview:
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TopicsCard tag={topic} metadataEvent={previewEvent} />
            <Button
              fullWidth
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => setTab(0)}
            >
              Back to Edit
            </Button>
          </>
        )}
      </Box>
    </Modal>
  );
};

export default TopicMetadataModal;
