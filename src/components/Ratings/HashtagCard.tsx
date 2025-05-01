import React from "react";
import { Card, CardContent, Typography } from "@mui/material";
import Rate from "./Rate";

// const fakeEvent = (tag: string) => ({
//   kind: 34259,
//   id: tag,
//   pubkey: "",
//   created_at: 0,
//   content: "",
//   sig: "",
//   tags: [
//     ["d", tag],
//     ["m", "hashtag"],
//   ],
// });

const HashtagCard: React.FC<{ tag: string }> = ({ tag }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Typography variant="h6">{tag}</Typography>
      <Rate entityId={tag} entityType="hashtag" />
    </CardContent>
  </Card>
);

export default HashtagCard;
