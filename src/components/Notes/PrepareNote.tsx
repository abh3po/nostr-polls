import { useEffect, useState } from "react";
import { useAppContext } from "../../hooks/useAppContext";
import { defaultRelays } from "../../nostr";
import { Event } from "nostr-tools";
import { Notes } from ".";
import { Button, Typography } from "@mui/material";

interface PrepareNoteInterface {
  eventId: string;
}

export const PrepareNote: React.FC<PrepareNoteInterface> = ({ eventId }) => {
  let { poolRef } = useAppContext();
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    const fetchEvent = async (id: string) => {
      const filter = {
        ids: [id],
      };
      let result = await poolRef.current.get(defaultRelays, filter);
      setEvent(result);
    };
    if (eventId && !event) {
      fetchEvent(eventId);
    }
  }, [eventId, poolRef, event]);

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
