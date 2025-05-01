import React, { useEffect, useState } from "react";
import { PollFeed } from "./PollFeed"; // <- All your old logic is now in here
import RatingsFeed from "../Ratings/RatingsFeed";
import { Box, Typography, Paper } from "@mui/material";

const FEED_KEY = "user-selected-feed";
type FeedType = "polls" | "ratings";

const PrepareFeed: React.FC = () => {
  const [feed, setFeed] = useState<FeedType>(
    () => (localStorage.getItem(FEED_KEY) as FeedType) || "polls"
  );

  const handleFeedChange = (newFeed: FeedType) => {
    setFeed(newFeed);
    localStorage.setItem(FEED_KEY, newFeed);
  };

  return (
    <Box maxWidth={900} mx="auto" mt={4}>
      <Box display="flex" justifyContent="center" gap={4} mb={4}>
        <FeedCard
          label="Polls"
          active={feed === "polls"}
          onClick={() => handleFeedChange("polls")}
        />
        <FeedCard
          label="Ratings"
          active={feed === "ratings"}
          onClick={() => handleFeedChange("ratings")}
        />
      </Box>

      {feed === "polls" && <PollFeed />}
      {feed === "ratings" && <RatingsFeed />}
    </Box>
  );
};

export default PrepareFeed;

const FeedCard = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <Paper
    elevation={active ? 6 : 2}
    onClick={onClick}
    sx={{
      padding: 3,
      cursor: "pointer",
      borderRadius: 4,
      border: active ? "2px solid #1976d2" : "1px solid #ccc",
      minWidth: 150,
      textAlign: "center",
      transition: "all 0.3s",
      "&:hover": {
        boxShadow: 6,
      },
    }}
  >
    <Typography variant="h6">{label}</Typography>
  </Paper>
);
