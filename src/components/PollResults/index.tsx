import { useNavigate, useParams } from "react-router-dom";
import { Filter } from "nostr-tools/lib/types/filter";
import { Event } from "nostr-tools/lib/types/core";
import { SimplePool } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import { Analytics } from "./Analytics";
import { SubCloser } from "nostr-tools/lib/types/abstract-pool";
import { useNotification } from "../../contexts/notification-context";
import { NOTIFICATION_MESSAGES } from "../../constants/notifications";

const PollResults = () => {
  let { eventId } = useParams();
  const [pollEvent, setPollEvent] = useState<Event | undefined>();
  const [respones, setResponses] = useState<Event[] | undefined>();
  const { showNotification } = useNotification();
  let navigate = useNavigate();

  const getUniqueLatestEvents = (events: Event[]) => {
    const eventMap = new Map<string, any>();

    events.forEach((event) => {
      if (
        !eventMap.has(event.pubkey) ||
        event.created_at > eventMap.get(event.pubkey).created_at
      ) {
        eventMap.set(event.pubkey, event);
      }
    });

    return Array.from(eventMap.values());
  };

  const handleResultEvent = (event: Event) => {
    if (event.kind === 1068) {
      setPollEvent(event);
    }
    if (event.kind === 1070 || event.kind === 1018) {
      setResponses((prevResponses) => [...(prevResponses || []), event]);
    }
  };

  const fetchPollEvents = async () => {
    if (!eventId) {
      showNotification(NOTIFICATION_MESSAGES.INVALID_URL, "error");
      navigate("/");
    }
    let resultFilter: Filter = {
      "#e": [eventId!],
      kinds: [1070, 1018],
    };

    let pollFilter: Filter = {
      ids: [eventId!],
    };
    let pool = new SimplePool();
    let closer = pool.subscribeMany(defaultRelays, [resultFilter, pollFilter], {
      onevent: handleResultEvent,
    });
    return closer;
  };

  useEffect(() => {
    let closer: SubCloser | undefined;
    if (!pollEvent && !closer) {
      fetchPollEvents();
    }
    return () => {
      if (closer) closer.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollEvent]);

  console.log(pollEvent);

  if (pollEvent === undefined) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <>
      <Analytics
        pollEvent={pollEvent}
        responses={getUniqueLatestEvents(respones || [])}
      />
    </>
  );
};

export default PollResults;
