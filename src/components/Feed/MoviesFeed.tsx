// components/Feed/MoviesFeed.tsx
import React, { useEffect, useRef, useState } from "react";
import { Filter, SimplePool } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import MovieCard from "../Movies/MovieCard";
import RateMovieModal from "../Ratings/RateMovieModal";
import { Card, CardContent, Typography } from "@mui/material";
import { useUserContext } from "../../hooks/useUserContext";
import { useNavigate } from "react-router-dom/dist";

const BATCH_SIZE = 10;

const MoviesFeed: React.FC = () => {
  const [movieIds, setMovieIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const { user } = useUserContext();
  const navigate = useNavigate();
  const seen = useRef<Set<string>>(new Set());

  const fetchBatch = () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const pool = new SimplePool();
    const now = Math.floor(Date.now() / 1000);
    const newIds: Set<string> = new Set();

    const filter: Filter = {
      kinds: [34259],
      "#m": ["movie"],
      limit: BATCH_SIZE,
      until: cursor || now,
    };

    if (user?.follows?.length) {
      filter.authors = user.follows;
    }

    const sub = pool.subscribeMany(defaultRelays, [filter], {
      onevent: (event) => {
        const dTag = event.tags.find((t) => t[0] === "d");
        if (dTag && dTag[1].startsWith("movie:")) {
          const imdbId = dTag[1].split(":")[1];
          if (!seen.current.has(imdbId)) {
            seen.current.add(imdbId);
            newIds.add(imdbId);
          }
        }

        if (!cursor || event.created_at < cursor) {
          setCursor(event.created_at);
        }
      },
      oneose: () => {
        setMovieIds(
          (prev) => new Set([...Array.from(prev), ...Array.from(newIds)])
        );
        if (newIds.size < BATCH_SIZE) setHasMore(false);
        setLoading(false);
        sub.close();
      },
    });

    setTimeout(() => {
      setMovieIds(
        (prev) => new Set([...Array.from(prev), ...Array.from(newIds)])
      );
      if (newIds.size < BATCH_SIZE) setHasMore(false);
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

      {Array.from(movieIds).map((id) => (
        <div
          key={id}
          onClick={() => navigate(`${id}`)}
          style={{ cursor: "pointer" }}
        >
          <MovieCard imdbId={id} />
        </div>
      ))}

      {hasMore && (
        <Card sx={{ mt: 2, cursor: "pointer" }} onClick={fetchBatch}>
          <CardContent>
            <Typography align="center">Load More</Typography>
          </CardContent>
        </Card>
      )}

      <RateMovieModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default MoviesFeed;
