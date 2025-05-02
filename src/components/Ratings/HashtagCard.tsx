import React from "react";
import { Card, CardContent, Typography } from "@mui/material";
import Rate from "./Rate";

const HashtagCard: React.FC<{ tag: string }> = ({ tag }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Typography
        variant="h6"
        style={{ textUnderlineOffset: "0.1em", cursor: "pointer" }}
        onClick={() => window.open(`https://snort.social/t/${tag}`, "_blank")}
      >
        {tag}
      </Typography>
      <Rate entityId={tag} entityType="hashtag" />
    </CardContent>
  </Card>
);

export default HashtagCard;
