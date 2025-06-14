import React, { useEffect, useState } from "react";
import { Event, Filter, SimplePool } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import MovieCard from "../Movies/MovieCard";
import RateMovieModal from "../Ratings/RateMovieModal";
import { Card, CardContent, Typography } from "@mui/material";
import { useUserContext } from "../../hooks/useUserContext";
import { Link } from "react-router-dom/dist";

const MoviesFeed: React.FC = () => {
  const [movieIds, setMovieIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useUserContext();
  const seen = new Set<string>();

  useEffect(() => {
    const pool = new SimplePool();
    let filter: Filter = { kinds: [34259], "#m": ["movie"] };
    if (user?.follows) filter.authors = user?.follows;
    const sub = pool.subscribeMany(defaultRelays, [filter], {
      onevent: (event: Event) => {
        console.log("FOund event", event);
        const dTag = event.tags.find((t) => t[0] === "d");
        if (dTag && dTag[1].startsWith("movie:")) {
          const imdbId = dTag[1].split(":")[1];
          if (!seen.has(imdbId)) {
            seen.add(imdbId);
            setMovieIds((prev) => [...prev, imdbId]);
          }
        }
      },
    });

    return () => sub.close();
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

      {movieIds.map((id) => (
        <Link
          key={id}
          to={`/movies/${id}`}
          style={{ textDecoration: "none" }}
        >
          <MovieCard imdbId={id} />
        </Link>
      ))}

      <RateMovieModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default MoviesFeed;
