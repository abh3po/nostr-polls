import React, { useState } from "react";
import { Box, Tabs, Tab, useMediaQuery, useTheme } from "@mui/material";
import NotesFeed from "./NotesFeed/components";
import ProfilesFeed from "./ProfileFeed";
import HashtagsFeed from "./HashtagsFeed";
import { PollFeed } from "./PollFeed";
import MoviesFeed from "./MoviesFeed";

type FeedType = "polls" | "notes" | "profiles" | "hashtags" | "movies";

const feedOptions: { value: FeedType; label: string }[] = [
  { value: "polls", label: "Polls" },
  { value: "notes", label: "Notes" },
  { value: "movies", label: "Movies" },
  { value: "profiles", label: "Profiles" },
  { value: "hashtags", label: "Hashtags" },
  // Add more here easily in future
];

const RatingFeed: React.FC = () => {
  const [feedType, setFeedType] = useState<FeedType>("polls");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // if (!user) return <div>Login to view this feed</div>;

  return (
    <Box maxWidth={800} mx="auto" px={2}>
      <Tabs
        value={feedType}
        onChange={(_, newValue: FeedType) => setFeedType(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          mb: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          "& .MuiTab-root": {
            textTransform: "none",
            minWidth: isMobile ? 80 : 120,
            fontWeight: 500,
          },
        }}
      >
        {feedOptions.map((option) => {
          return (
            <Tab key={option.value} label={option.label} value={option.value} />
          );
        })}
      </Tabs>

      {feedType === "notes" && <NotesFeed />}
      {feedType === "profiles" && <ProfilesFeed />}
      {feedType === "hashtags" && <HashtagsFeed />}
      {feedType === "polls" && <PollFeed />}
      {feedType === "movies" && <MoviesFeed />}
    </Box>
  );
};

export default RatingFeed;
