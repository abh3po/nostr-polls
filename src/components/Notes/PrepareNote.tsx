import { useEffect, useState } from "react";
import { useRelays } from "../../hooks/useRelays";
import { Event, nip19 } from "nostr-tools";
import { Notes } from ".";
import { Button, Typography } from "@mui/material";
import { nostrRuntime } from "../../singletons";
import { EventPointer } from "nostr-tools/lib/types/nip19";

interface PrepareNoteInterface {
  neventId: string;
}

export const PrepareNote: React.FC<PrepareNoteInterface> = ({ neventId }) => {
  const { relays } = useRelays();
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    const fetchEvent = async (neventId: string) => {
      try {
        const decoded = nip19.decode(neventId).data as EventPointer;
        const filter = { ids: [decoded.id] };
        const neventRelays = decoded.relays;
        const relaysToUse = Array.from(
          new Set([...relays, ...(neventRelays || [])])
        );
        let result = await nostrRuntime.fetchOne(relaysToUse, filter);
        setEvent(result);
      } catch (error) {
        console.error("Error fetching event:", error);
      }
    };
    if (neventId && !event) {
      fetchEvent(neventId);
    }
  }, [neventId, event, , relays]);

  if (event) return <Notes event={event} />;
  else
    return (
      <Typography style={{ fontSize: 10 }} color="primary">
        Loading...
        <p>{neventId}</p>
      </Typography>
    );
};
