import React from "react";
import { Card, CardContent, Typography, Rating, Box } from "@mui/material";
import { Event } from "nostr-tools";

export interface EventItem {
  id: string;
  kind: "note" | "profile";
  content: string;
  rating?: number;
  outOf?: number;
}

interface Props {
  event: Event;
  onRate: (id: string, rating: number, outOf: number) => void;
}

const EventCard: React.FC<Props> = ({ event, onRate }) => {
  const handleRatingChange = (_: any, newRating: number | null) => {
    if (newRating != null) {
      onRate(event.id, newRating, 5); // Assuming outOf = 5
    }
  };

  const { tags, content } = event;

  const rating = Number(tags.find((tag) => tag[0] === "rating")?.[1] || -1);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="body1" gutterBottom>
          {content}
        </Typography>
        <Box>
          <Rating
            name={`rating-${event.id}`}
            value={rating ?? 0}
            max={5}
            onChange={handleRatingChange}
          />
          {rating != null && (
            <Typography variant="caption" color="text.secondary">
              Rated: {rating} / 5 ({(rating / 5).toFixed(2)})
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default EventCard;
