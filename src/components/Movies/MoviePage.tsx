import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Typography, Box, CircularProgress } from "@mui/material";
import { SimplePool, Event, Filter } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import MovieCard from "./MovieCard";
import ReviewCard from "../Ratings/ReviewCard"; // You’ll define this next
import { useUserContext } from "../..//hooks/useUserContext";
import { useAppContext } from "../../hooks/useAppContext";

const MoviePage = () => {
  const { imdbId } = useParams<{ imdbId: string }>();
  const [metadata, setMetadata] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewMap, setReviewMap] = useState<Map<string, Event>>(new Map());
  const { user } = useUserContext()

  useEffect(() => {
    if (!imdbId) return;

    const pool = new SimplePool();
    let reviewFilter: Filter = {
        kinds: [34259],
        "#d": [`movie:${imdbId}`],
        "#c": ["true"],
      }
    if (user?.follows) reviewFilter.authors = user.follows
    const sub = pool.subscribeMany(
      defaultRelays,
      [
        {
          kinds: [30300],
          "#d": [`movie:${imdbId}`],
        },
        reviewFilter
      ],
      {
        onevent(e) {
          if (e.kind === 30300) {
            setMetadata(e);
          } else if (e.kind === 34259) {
            setReviewMap((prev) => {
              if (prev.has(e.id)) return prev;
              const newMap = new Map(prev);
              newMap.set(e.id, e);
              return newMap;
            });
          }
        },
        oneose() {
          setLoading(false);
        },
      }
    );

    return () => sub.close();
  }, [imdbId]);

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 4 }}>
      {metadata ? (
        <MovieCard imdbId={imdbId!} metadataEvent={metadata} previewMode />
      ) : (
        <Typography variant="h6">No metadata available</Typography>
      )}

      <Typography variant="h5" mt={4} mb={2}>
        Reviews
      </Typography>

      {reviewMap.size ? (
        Array.from(reviewMap.values()).map((review) => (
          <ReviewCard key={review.id} event={review} />
        ))
      ) : (
        <Typography>No reviews yet.</Typography>
      )}
    </Box>
  );
};

export default MoviePage;
