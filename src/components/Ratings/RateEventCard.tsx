import React from "react";
import { Card, CardActionArea, CardContent, Typography } from "@mui/material";

interface Props {
  onClick: () => void;
}

const RateEventCard: React.FC<Props> = ({ onClick }) => {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardActionArea onClick={onClick}>
        <CardContent>
          <Typography variant="h6">Click to Rate Any Event</Typography>
          <Typography variant="body2" color="text.secondary">
            Enter a Nostr event link and submit a rating.
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default RateEventCard;
