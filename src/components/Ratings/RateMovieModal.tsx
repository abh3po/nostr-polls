import React, { useState } from "react";
import { Box, Button, Modal, TextField, Typography } from "@mui/material";
import MovieCard from "../Movies/MovieCard";

interface RateMovieModalProps {
  open: boolean;
  onClose: () => void;
}

const RateMovieModal: React.FC<RateMovieModalProps> = ({ open, onClose }) => {
  const [imdbInput, setImdbInput] = useState("");
  const [selectedImdbId, setSelectedImdbId] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmed = imdbInput.trim();
    if (!/^tt\d{7,}$/.test(trimmed)) return; // very basic IMDb ID validation
    setSelectedImdbId(trimmed);
  };

  const handleClose = () => {
    setImdbInput("");
    setSelectedImdbId(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          p: 4,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          maxWidth: 500,
          mx: "auto",
          mt: "10%",
        }}
      >
        <Typography variant="h6" mb={2}>
          Rate a Movie
        </Typography>

        {!selectedImdbId ? (
          <>
            <TextField
              fullWidth
              label="IMDb ID (e.g. tt1375666)"
              variant="outlined"
              value={imdbInput}
              onChange={(e) => setImdbInput(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button variant="contained" fullWidth onClick={handleSubmit}>
              Load Movie
            </Button>
          </>
        ) : (
          <>
            <MovieCard imdbId={selectedImdbId} />
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleClose}
            >
              Close
            </Button>
          </>
        )}
      </Box>
    </Modal>
  );
};

export default RateMovieModal;
