import React, { useState } from "react";
import { Box, Button, Modal, TextField, Typography } from "@mui/material";
import HashtagCard from "./HashtagCard";

interface RateHashtagModalProps {
  open: boolean;
  onClose: () => void;
}

const RateHashtagModal: React.FC<RateHashtagModalProps> = ({
  open,
  onClose,
}) => {
  const [hashtagInput, setHashtagInput] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!hashtagInput.trim()) return;
    setSelectedTag(hashtagInput.trim().toLowerCase());
  };

  const handleClose = () => {
    setHashtagInput("");
    setSelectedTag(null);
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
          Rate a Hashtag
        </Typography>

        {!selectedTag ? (
          <>
            <TextField
              fullWidth
              label="Hashtag"
              variant="outlined"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button variant="contained" fullWidth onClick={handleSubmit}>
              Load Hashtag
            </Button>
          </>
        ) : (
          <>
            <HashtagCard tag={selectedTag} />
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

export default RateHashtagModal;
