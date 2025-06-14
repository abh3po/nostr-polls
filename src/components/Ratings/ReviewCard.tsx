import React from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";
import { nip19, Event } from "nostr-tools";

interface Props {
  event: Event;
}

const ReviewCard: React.FC<Props> = ({ event }) => {
  const rating = parseFloat(event.tags.find((t) => t[0] === "rating")?.[1] || "0") * 5;
  const content = event.content;
  const pubkey = event.pubkey;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle1">
          {rating.toFixed(1)} ★ by {nip19.npubEncode(pubkey)}
        </Typography>
        {content && (
          <Typography variant="body1" mt={1}>
            {content}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewCard;
