import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Rating as MuiRating,
  Alert,
} from "@mui/material";
import { useRating } from "../../hooks/useRating";

interface Props {
  entityId: string;
  entityType?: string; // 'event', 'profile', etc.
}

const Rate: React.FC<Props> = ({ entityId, entityType = "event" }) => {
  const ratingKey = `${entityType}:${entityId}`;
  const { averageRating, totalRatings, submitRating, userRatingEvent } =
    useRating(ratingKey);

  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [showContentInput, setShowContentInput] = useState(false);
  const [error, setError] = useState("");

  const hasExistingRating = !!userRatingEvent;
  const hasExistingContent = !!userRatingEvent?.content?.trim();

  useEffect(() => {
    if (hasExistingRating) {
      const userRating = userRatingEvent.tags.find((t) => t[0] === "rating")?.[1];
      if (userRating) {
        console.log("USER RATING IS", userRating)
        setRatingValue(parseFloat(userRating)*5);
      }
    }
  }, [userRatingEvent])

  const handleSubmit = () => {
    if (ratingValue === null) {
      setError("Please give a rating before submitting a review.");
      return;
    }
    setError("");
    submitRating(ratingValue, 5, entityType, content);
    setShowContentInput(false);
  };
  return (
    <Box>
      <MuiRating
        name={`rating-${entityId}`}
        value={averageRating ? averageRating * 5 : null}
        max={5}
        precision={0.1}
        onChange={(_, newValue) => {
          if (newValue != null) {
            setRatingValue(newValue);
            setError("");
            console.log("NEW VALUE IS", newValue)
            submitRating(newValue, 5, entityType);
          }
        }}
      />

      {totalRatings ? (
        <Typography variant="caption" color="text.secondary">
          Rated: {(averageRating! * 5).toFixed(2)} from {totalRatings} rating
          {totalRatings !== 1 ? "s" : ""}
        </Typography>
      ) : null}

      {(!hasExistingRating || !hasExistingContent) && !showContentInput && (
        <Button
          variant="text"
          sx={{ mt: 1 }}
          onClick={() => setShowContentInput(true)}
        >
          Add review to your rating?
        </Button>
      )}

      {showContentInput && (
        <>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Your Review"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            sx={{ mt: 2 }}
          />
          <Button
            variant="contained"
            sx={{ mt: 1 }}
            onClick={handleSubmit}
          >
            Submit Review
          </Button>
        </>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default Rate;
