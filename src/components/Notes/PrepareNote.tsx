import { useEffect, useState, useCallback } from "react";
import { useRelays } from "../../hooks/useRelays";
import { Event, nip19 } from "nostr-tools";
import { Notes } from ".";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { nostrRuntime } from "../../singletons";
import { EventPointer } from "nostr-tools/lib/types/nip19";
import PollResponseForm from "../PollResponse/PollResponseForm";

interface PrepareNoteInterface {
  neventId: string;
}

export const PrepareNote: React.FC<PrepareNoteInterface> = ({ neventId }) => {
  const { relays } = useRelays();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    setEvent(null);
    try {
      const decoded = nip19.decode(neventId).data as EventPointer;

      const neventRelays = decoded.relays;
      const relaysToUse = Array.from(
        new Set([...relays, ...(neventRelays || [])])
      );
      // fetchBatched checks cache first and batches multiple IDs
      // requested within a 50ms window into a single relay query
      const result = await nostrRuntime.fetchBatched(relaysToUse, decoded.id);
      setEvent(result);
    } catch (error) {
      console.error("Error fetching event:", error);
    } finally {
      setLoading(false);
    }
  }, [neventId, relays]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent, retryCount]);

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };

  if (event) {
    if (event.kind === 1068) {
      return <PollResponseForm pollEvent={event} />;
    }
    return <Notes event={event} />;
  }

  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={1} p={2}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading referenced note...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Could not load referenced note.
      </Typography>
      <Button
        size="small"
        startIcon={<RefreshIcon />}
        onClick={handleRetry}
        disabled={loading}
      >
        Retry
      </Button>
    </Box>
  );
};
