import { useNavigate, useParams } from "react-router-dom";
import PollResponseForm from "./PollResponseForm";
import { useEffect, useState } from "react";
import { Event } from 'nostr-tools/lib/types/core';
import { Filter } from 'nostr-tools/lib/types/filter';
import { defaultRelays } from "../../nostr";
import { Button, Typography } from "@mui/material";
import { useAppContext } from "../../hooks/useAppContext";
import { useNotification } from "../../contexts/notification-context";
import { NOTIFICATION_MESSAGES } from "../../constants/notifications";

export const PollResponse = () => {
  const { eventId } = useParams();
  const [pollEvent, setPollEvent] = useState<Event | undefined>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const { poolRef } = useAppContext();

  const fetchPollEvent = async () => {
    if (!eventId) {
      showNotification(NOTIFICATION_MESSAGES.INVALID_URL, "error");
      navigate("/");
      return;
    }
    const filter: Filter = {
      ids: [eventId!],
    };
    try {
      const events = await poolRef.current.querySync(defaultRelays, filter);
      if (events.length === 0) {
        showNotification(NOTIFICATION_MESSAGES.POLL_NOT_FOUND, "error");
        navigate("/");
        return;
      }
      setPollEvent(events[0]);
    } catch (error) {
      console.error("Error fetching poll event:", error);
      showNotification(NOTIFICATION_MESSAGES.POLL_FETCH_ERROR, "error");
      navigate("/");
    }
  };


  useEffect(() => {
    fetchPollEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  if (pollEvent === undefined) return <Typography>Loading...</Typography>;

  return (
    <>
      <PollResponseForm pollEvent={pollEvent} />
      <Button onClick={() => navigate("/")}>Feed</Button>
    </>
  );
};
