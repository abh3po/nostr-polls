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
import { signEvent } from "../../nostr";
import { useRelays } from "../../hooks/useRelays";
import { SimplePool, Event } from "nostr-tools";
import MovieCard from "./MovieCard";

interface MovieMetadataModalProps {
  open: boolean;
  onClose: () => void;
  imdbId: string;
}

const MovieMetadataModal: React.FC<MovieMetadataModalProps> = ({
  open,
  onClose,
  imdbId,
}) => {
  const [title, setTitle] = useState("");
  const [poster, setPoster] = useState("");
  const [year, setYear] = useState("");
  const [summary, setSummary] = useState("");
  const [tab, setTab] = useState(0);
  const [previewEvent, setPreviewEvent] = useState<Event>();
  const { relays } = useRelays();

  useEffect(() => {
    const initialize = async () => {
      if (!open) return; // Only initialize when modal is actually open
      else {
        setPreviewEvent(await buildPreviewEvent());
      }
    };
    initialize();
  }, [title, poster, year, summary, open]);

  const buildTags = () => [
    ["d", `movie:${imdbId}`],
    ...(poster ? [["poster", poster]] : []),
    ...(year ? [["year", year]] : []),
    ...(summary ? [["summary", summary]] : []),
  ];

  const buildPreviewEvent = async (): Promise<Event> => {
    return {
      id: "Random",
      kind: 30300,
      content: title || "Untitled",
      tags: buildTags(),
      created_at: Math.floor(Date.now() / 1000),
      pubkey: "placeholder_pubkey",
      sig: "placeholder_signature",
    };
  };

  const handlePublish = async () => {
    const event = {
      kind: 30300,
      content: title || "Untitled",
      tags: buildTags(),
      created_at: Math.floor(Date.now() / 1000),
    };

    const signed = await signEvent(event);
    if (!signed) throw new Error("Signing failed");

    const pool = new SimplePool();
    pool.publish(relays, signed);
    onClose();
  };

  const renderEditTab = () => (
    <>
      <TextField
        fullWidth
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Poster URL"
        value={poster}
        onChange={(e) => setPoster(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Year"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        multiline
        rows={3}
        label="Summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
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
  );

  const renderPreviewTab = () => (
    <>
      <Typography variant="subtitle2" gutterBottom>
        Preview:
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <MovieCard imdbId={imdbId} metadataEvent={previewEvent} />
      <Button
        fullWidth
        variant="outlined"
        sx={{ mt: 2 }}
        onClick={() => setTab(0)}
      >
        Back to Edit
      </Button>
    </>
  );

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
        <Typography variant="h6">Add Movie Metadata</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
          IMDb ID: <code>{imdbId}</code>
        </Typography>

        <Tabs value={tab} onChange={(_, val) => setTab(val)} sx={{ mb: 2 }}>
          <Tab label="Edit" />
          <Tab label="Preview" />
        </Tabs>

        {tab === 0 ? renderEditTab() : renderPreviewTab()}
      </Box>
    </Modal>
  );
};

export default MovieMetadataModal;
