import React, { useEffect, useState, useCallback } from "react";
import { Event, Filter } from "nostr-tools";
import { Box, CircularProgress, Typography } from "@mui/material";
import { Virtuoso } from "react-virtuoso";
import { nostrRuntime } from "../../singletons";
import { useRelays } from "../../hooks/useRelays";
import ReviewCard from "../Ratings/ReviewCard";

interface UserRatingsGivenProps {
  pubkey: string;
}

const KIND_RATING = 34259;

const UserRatingsGiven: React.FC<UserRatingsGivenProps> = ({ pubkey }) => {
  const [ratings, setRatings] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { relays } = useRelays();

  const fetchRatings = useCallback(() => {
    if (!pubkey) return;

    setLoading(true);
    const filters: Filter[] = [
      {
        kinds: [KIND_RATING],
        authors: [pubkey],
        limit: 50,
      },
    ];

    const handle = nostrRuntime.subscribe(relays, filters, {
      onEvent(event) {
        setRatings((prev) => {
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
    const cleanup = fetchRatings();
    return cleanup;
  }, [fetchRatings]);

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

  if (ratings.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          No ratings yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "600px" }}>
      <Virtuoso
        data={ratings}
        itemContent={(index, rating) => (
          <Box key={rating.id} sx={{ mb: 2 }}>
            <ReviewCard event={rating} />
          </Box>
        )}
      />
    </Box>
  );
};

export default UserRatingsGiven;
