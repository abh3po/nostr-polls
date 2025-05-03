import React from "react";
import { Card, CardContent, Typography } from "@mui/material";
import Rate from "../Ratings/Rate";

interface Props {
  event: any;
}

const EventJsonCard: React.FC<Props> = ({ event }) => {
  return (
    <Card variant="outlined" sx={{ my: 2 }}>
      <CardContent style={{ maxHeight: 400, overflowY: "scroll" }}>
        <Typography variant="h6" gutterBottom>
          Event JSON
        </Typography>
        <pre style={{ overflowX: "auto", overflowY: "scroll", fontSize: 12 }}>
          {JSON.stringify(event, null, 2)}
        </pre>
      </CardContent>
      <Rate entityId={event.id} entityType="event" />
    </Card>
  );
};

export default EventJsonCard;
