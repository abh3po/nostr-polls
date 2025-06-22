import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Typography,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { SimplePool, Event, Filter } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import MovieCard from "./MovieCard";
import ReviewCard from "../Ratings/ReviewCard";
import { useUserContext } from "../../hooks/useUserContext";

const MoviePage = () => {
  const { imdbId } = useParams<{ imdbId: string }>();
  const [loading, setLoading] = useState(true);
  const [reviewMap, setReviewMap] = useState<Map<string, Event>>(new Map());
  const [filterMode, setFilterMode] = useState<"everyone" | "following">(
    "everyone"
  );
  const { user } = useUserContext();

  const fetchReviews = useCallback(() => {
    if (!imdbId) return;

    const pool = new SimplePool();
    const newReviewMap = new Map<string, Event>();

    const filters: Filter[] = [
      {
        kinds: [34259],
        "#d": [`movie:${imdbId}`],
        "#c": ["true"],
        ...(filterMode === "following" && user?.follows?.length
          ? { authors: user.follows }
          : {}),
      },
    ];

    const sub = pool.subscribeMany(defaultRelays, filters, {
      onevent(e) {
        if (!newReviewMap.has(e.id)) {
          newReviewMap.set(e.id, e);
        }
      },
      oneose() {
        setReviewMap(newReviewMap);
        setLoading(false);
      },
    });

    return () => sub.close();
  }, [imdbId, filterMode, user?.follows]);

  useEffect(() => {
    setLoading(true);
    fetchReviews();
  }, [fetchReviews]);

  const handleFilterChange = (
    event: SelectChangeEvent<"everyone" | "following">
  ) => {
    setFilterMode(event.target.value as "everyone" | "following");
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 4 }}>
      <MovieCard imdbId={imdbId!} />
      <Box mt={4} mb={2} display="flex" alignItems="center" gap={2}>
        <Typography variant="h5">Reviews</Typography>

        <FormControl size="small">
          <InputLabel id="review-filter-label">Filter</InputLabel>
          <Select
            labelId="review-filter-label"
            value={filterMode}
            onChange={handleFilterChange}
            label="Filter"
          >
            <MenuItem value="everyone">Everyone</MenuItem>
            <MenuItem value="following" disabled={!!!user?.follows}>
              People I Follow
            </MenuItem>
          </Select>
        </FormControl>
      </Box>

      {reviewMap.size ? (
        Array.from(reviewMap.values()).map((review) => (
          <ReviewCard key={review.id} event={review} />
        ))
      ) : (
        <Typography>No reviews found.</Typography>
      )}
    </Box>
  );
};

export default MoviePage;
