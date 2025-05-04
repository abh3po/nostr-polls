import React from "react";
import { Typography, Rating, Box } from "@mui/material";
import { useRating } from "../../hooks/useRating"; // custom hook from context

interface Props {
  entityId: string;
  entityType?: string; // 'event', 'profile', etc.
}

const Rate: React.FC<Props> = ({ entityId, entityType = "event" }) => {
  const { averageRating, totalRatings, submitRating } = useRating(entityId);
  const handleRatingChange = (_: any, newRating: number | null) => {
    if (newRating != null) {
      submitRating(newRating, 5, entityType);
    }
  };

  return (
    <Box>
      <Rating
        name={`rating-${entityId}`}
        value={averageRating ? averageRating * 5 : null}
        max={5}
        precision={0.1}
        onChange={handleRatingChange}
      />
      {totalRatings ? (
        <Typography variant="caption" color="text.secondary">
          Rated: {(averageRating! * 5).toFixed(2)} from {totalRatings} rating
          {totalRatings !== 1 ? "s" : ""}
        </Typography>
      ) : null}
    </Box>
  );
};

export default Rate;
