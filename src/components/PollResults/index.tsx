import { useNavigate, useParams } from "react-router-dom";
import { Filter } from "nostr-tools/lib/types/filter";
import { Event } from "nostr-tools/lib/types/core";
import { useRelays } from "../../hooks/useRelays";
import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import { Analytics } from "./Analytics";
import { nostrRuntime } from "../../singletons";
import { useNotification } from "../../contexts/notification-context";
import { NOTIFICATION_MESSAGES } from "../../constants/notifications";

export const PollResults = () => {
  let { eventId } = useParams();
  const [pollEvent, setPollEvent] = useState<Event | undefined>();
  const [respones, setResponses] = useState<Event[] | undefined>();
  const { showNotification } = useNotification();
  const { relays } = useRelays();
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
    let closer = nostrRuntime.subscribe(relays, [resultFilter, pollFilter], {
      onEvent: handleResultEvent,
    });
    return closer;
  };

  useEffect(() => {
    let closer: Awaited<ReturnType<typeof fetchPollEvents>> | undefined;
    if (!pollEvent && !closer) {
      fetchPollEvents().then((c) => {
        closer = c;
      });
    }
    return () => {
      if (closer) closer.unsubscribe();
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
