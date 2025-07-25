import { useEffect, useState } from "react";
import { useAppContext } from "../../hooks/useAppContext";
import { useRelays } from "../../hooks/useRelays";
import { Event } from "nostr-tools";
import { Notes } from ".";
import { Button, Typography } from "@mui/material";
import { pool } from "../..//singletons";

interface PrepareNoteInterface {
  eventId: string;
}

export const PrepareNote: React.FC<PrepareNoteInterface> = ({ eventId }) => {
  const { relays } = useRelays();
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    const fetchEvent = async (id: string) => {
      const filter = {
        ids: [id],
      };
      let result = await pool.get(relays, filter);
      setEvent(result);
    };
    if (eventId && !event) {
      fetchEvent(eventId);
    }
  }, [eventId, event]);

  if (event) return <Notes event={event} />;
  else
    return (
      <Typography style={{ fontSize: 10 }}>
        <Button
          variant="text"
          onClick={() => {
            window.open(`/respond/${eventId}`, "_blank noreferrer");
          }}
        >
          {eventId}
        </Button>
      </Typography>
    );
};
