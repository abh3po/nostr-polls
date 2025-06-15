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
import { useSigner } from "../../contexts/signer-context";
import { defaultRelays, signEvent } from "../../nostr";
import { UnsignedEvent, SimplePool } from "nostr-tools";
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
  const [previewEvent, setPreviewEvent] = useState<UnsignedEvent>();
  const { signer } = useSigner();

  useEffect(() => {
    const initialize = async () => {
      if (!signer) return;
      else {
        setPreviewEvent(await buildPreviewEvent());
      }
    };
    initialize()
  }, [title, poster, year, summary, signer]);
  if (!signer) {
    return (
      <Modal open={open} onClose={onClose}>
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
          <Typography>You need to login to publish metadata</Typography>
        </Box>
      </Modal>
    );
  }

  const buildTags = () => [
    ["d", `movie:${imdbId}`],
    ...(poster ? [["poster", poster]] : []),
    ...(year ? [["year", year]] : []),
    ...(summary ? [["summary", summary]] : []),
  ];

  const buildPreviewEvent = async (): Promise<UnsignedEvent> => {
    const pubkey = await signer.getPublicKey();
    return {
      kind: 30300,
      content: title || "Untitled",
      tags: buildTags(),
      created_at: Math.floor(Date.now() / 1000),
      pubkey,
    };
  };

  const handlePublish = async () => {
    if (!signer) return;

    const pubkey = await signer.getPublicKey();
    const event = {
      kind: 30300,
      content: title || "Untitled",
      tags: buildTags(),
      created_at: Math.floor(Date.now() / 1000),
      pubkey,
    };

    const signed = await signEvent(event, signer);
    if (!signed) throw new Error("Signing failed");

    const pool = new SimplePool();
    pool.publish(defaultRelays, signed);
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
      <MovieCard imdbId={imdbId} previewMode metadataEvent={previewEvent} />
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
      >
        <Typography variant="h6" mb={2}>
          Add Movie Metadata
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
