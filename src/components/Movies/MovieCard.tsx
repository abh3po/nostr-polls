import React, { useEffect, useState } from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import Rate from "../Ratings/Rate";

interface Movie {
  id: number;
  title: string;
  imdb_id: string;
  year: string;
  poster?: string;
}

const fetchMovie = async (imdbId: string) => {
  try {
    const res = await fetch(`https://moviesapi.ir/api/v1/movies/${imdbId}`);
    if (!res.ok) throw new Error("Failed to fetch movie");

    // This line reads the body exactly once
    const data = await res.json();
    console.log("Got result as ", data, res);
    return data[0] || null; // API returns an array with movie object(s)
  } catch (error) {
    console.error("Fetch movie error:", error);
    return null;
  }
};

const MovieCard: React.FC<{ imdbId: string }> = ({ imdbId }) => {
  const [movie, setMovie] = useState<Movie | null>(null);

  useEffect(() => {
    fetchMovie(imdbId).then(setMovie);
  }, [imdbId]);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {movie?.poster && (
            <img
              src={movie.poster}
              alt={`${movie.title} Poster`}
              style={{ width: 60, borderRadius: 4 }}
            />
          )}
          <Box>
            <Typography
              variant="h6"
              sx={{ cursor: "pointer" }}
              onClick={() =>
                window.open(`https://www.imdb.com/title/${imdbId}`, "_blank")
              }
            >
              {movie?.title || imdbId} {movie?.year ? `(${movie.year})` : ""}
            </Typography>
            <Rate entityId={imdbId} entityType="movie" />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MovieCard;
