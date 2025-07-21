import { useNavigate, useParams } from "react-router-dom";
import PollResponseForm from "./PollResponseForm";
import { useEffect, useState } from "react";
import { Event } from 'nostr-tools/lib/types/core';
import { Filter } from 'nostr-tools/lib/types/filter';
import { useRelays } from "../../hooks/useRelays";
import { Box, Button, CircularProgress } from "@mui/material";
import { useAppContext } from "../../hooks/useAppContext";
import { useNotification } from "../../contexts/notification-context";
import { NOTIFICATION_MESSAGES } from "../../constants/notifications";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export const PollResponse = () => {
  const { eventId } = useParams();
  const [pollEvent, setPollEvent] = useState<Event | undefined>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const { poolRef } = useAppContext();
  const { relays } = useRelays();

  const fetchPollEvent = async () => {
    if (!eventId) {
      showNotification(NOTIFICATION_MESSAGES.INVALID_URL, "error");
      navigate("/");
      return;
    }
    const filter: Filter = {
      ids: [eventId],
    };
    try {
      const event = await poolRef.current.get(relays, filter);
      if (event === null) {
        showNotification(NOTIFICATION_MESSAGES.POLL_NOT_FOUND, "error");
        navigate("/");
        return;
      }
      setPollEvent(event);
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

  return (
    <Box sx={{ maxWidth: { xs: "100%", sm: 600 }, mx: 'auto', p: 2 }}>
      <Button variant="outlined" onClick={() => navigate("/")} sx={{ m: 1 }}>
        <ArrowBackIcon />Back to Feed
      </Button>
      {pollEvent === undefined ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : (
        <PollResponseForm pollEvent={pollEvent} />
      )}
    </Box>
  );
};
