import { useEffect, useState } from "react";
import { useRelays } from "../../hooks/useRelays";
import { Event, nip19 } from "nostr-tools";
import { Notes } from ".";
import { Box, CircularProgress, Typography } from "@mui/material";
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

  useEffect(() => {
    let cancelled = false;

    const fetchEvent = async () => {
      try {
        const decoded = nip19.decode(neventId).data as EventPointer;

        const neventRelays = decoded.relays;
        const relaysToUse = Array.from(
          new Set([...relays, ...(neventRelays || [])])
        );
        // fetchBatched checks cache first and batches multiple IDs
        // requested within a 50ms window into a single relay query
        const result = await nostrRuntime.fetchBatched(relaysToUse, decoded.id);
        if (!cancelled) {
          setEvent(result);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    fetchEvent();

    return () => {
      cancelled = true;
    };
  }, [neventId, relays]);

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
    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
      Could not load referenced note.
    </Typography>
  );
};
