// components/Feed/MoviesFeed.tsx
import React, { useEffect, useRef, useState } from "react";
import { Filter, SimplePool } from "nostr-tools";
import { useRelays } from "../../hooks/useRelays";
import MovieCard from "../Movies/MovieCard";
import RateMovieModal from "../Ratings/RateMovieModal";
import { Card, CardContent, Typography, CircularProgress, Box, Button } from "@mui/material";
import { useUserContext } from "../../hooks/useUserContext";
import { useNavigate } from "react-router-dom/dist";

const BATCH_SIZE = 10;

const MoviesFeed: React.FC = () => {
  const [movieIds, setMovieIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const { user } = useUserContext();
  const { relays } = useRelays();
  const navigate = useNavigate();
  const seen = useRef<Set<string>>(new Set());

  const fetchBatch = () => {
    if (loading) return;
    setLoading(true);

    const pool = new SimplePool();
    const currentCursor = cursor; // Capture cursor at start
    const now = Math.floor(Date.now() / 1000);
    const newIds: Set<string> = new Set();
    let oldestTimestamp: number | undefined;

    const filter: Filter = {
      kinds: [34259],
      "#m": ["movie"],
      limit: BATCH_SIZE,
      until: currentCursor || now,
    };

    if (user?.follows?.length) {
      filter.authors = user.follows;
    }

    const sub = pool.subscribeMany(relays, [filter], {
      onevent: (event) => {
        const dTag = event.tags.find((t) => t[0] === "d");
        if (dTag && dTag[1].startsWith("movie:")) {
          const imdbId = dTag[1].split(":")[1];
          if (!seen.current.has(imdbId)) {
            seen.current.add(imdbId);
            newIds.add(imdbId);
          }
        }

        // Track oldest timestamp for next cursor
        if (!oldestTimestamp || event.created_at < oldestTimestamp) {
          oldestTimestamp = event.created_at;
        }
      },
      oneose: () => {
        setMovieIds(
          (prev) => new Set([...Array.from(prev), ...Array.from(newIds)])
        );
        
        // Only update cursor if we got results
        if (oldestTimestamp) {
          setCursor(oldestTimestamp - 1);
        }
        
        setInitialLoadComplete(true);
        setLoading(false);
        sub.close();
      },
    });

    setTimeout(() => {
      setMovieIds(
        (prev) => new Set([...Array.from(prev), ...Array.from(newIds)])
      );
      
      // Only update cursor if we got results
      if (oldestTimestamp) {
        setCursor(oldestTimestamp - 1);
      }
      
      setInitialLoadComplete(true);
      setLoading(false);
      sub.close();
    }, 3000);
  };

  useEffect(() => {
    fetchBatch();
  }, []);

  return (
    <>
      <Card
        variant="outlined"
        sx={{ mb: 2 }}
        onClick={() => setModalOpen(true)}
      >
        <CardContent>
          <Typography variant="h6">Rate Any Movie</Typography>
          <Typography variant="body2" color="text.secondary">
            Click to enter an IMDb ID and submit a rating.
          </Typography>
        </CardContent>
      </Card>

      {loading && movieIds.size === 0 ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <Typography style={{margin: 10, fontSize: 18}}>Recently Rated</Typography>
          {Array.from(movieIds).map((id) => (
            <div
              key={id}
            >
              <MovieCard imdbId={id} />
            </div>
          ))}
        </Box>
      )}

      {initialLoadComplete && (
        <Box display="flex" justifyContent="center" my={2}>
          <Button
            onClick={fetchBatch}
            variant="contained"
            disabled={loading}
            sx={{ cursor: "pointer" }}
          >
            {loading ? <CircularProgress size={24} /> : "Load More"}
          </Button>
        </Box>
      )}

      <RateMovieModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default MoviesFeed;
