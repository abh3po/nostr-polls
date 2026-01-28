import React, { useEffect, useState, useCallback } from "react";
import { Event, Filter } from "nostr-tools";
import { Box, CircularProgress, Typography } from "@mui/material";
import { Virtuoso } from "react-virtuoso";
import { nostrRuntime } from "../../singletons";
import { useRelays } from "../../hooks/useRelays";
import { Notes } from "../Notes";

interface UserNotesFeedProps {
  pubkey: string;
}

const KIND_NOTE = 1;

const UserNotesFeed: React.FC<UserNotesFeedProps> = ({ pubkey }) => {
  const [notes, setNotes] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { relays } = useRelays();

  const fetchNotes = useCallback(() => {
    if (!pubkey) return;

    setLoading(true);
    const filters: Filter[] = [
      {
        kinds: [KIND_NOTE],
        authors: [pubkey],
        limit: 50,
      },
    ];

    const handle = nostrRuntime.subscribe(relays, filters, {
      onEvent(event) {
        setNotes((prev) => {
          const exists = prev.find((e) => e.id === event.id);
          if (exists) return prev;
          return [...prev, event].sort((a, b) => b.created_at - a.created_at);
        });
      },
      onEose() {
        setLoading(false);
      },
    });

    return () => handle.unsubscribe();
  }, [pubkey, relays]);

  useEffect(() => {
    const cleanup = fetchNotes();
    return cleanup;
  }, [fetchNotes]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "200px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (notes.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          No notes yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "600px" }}>
      <Virtuoso
        data={notes}
        itemContent={(index, note) => (
          <Box key={note.id} sx={{ mb: 2 }}>
            <Notes event={note} />
          </Box>
        )}
      />
    </Box>
  );
};

export default UserNotesFeed;
