import React, { useState } from "react";
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import NotesFeed from "./NotesFeed";
import ProfilesFeed from "./ProfileFeed";
import HashtagsFeed from "./HashtagsFeed";
import { useUserContext } from "../../hooks/useUserContext";

type FeedType = "notes" | "profiles" | "hashtags";

const RatingFeed: React.FC = () => {
  const [feedType, setFeedType] = useState<FeedType>("notes");
  const { user } = useUserContext();

  if (!user) return <div>Login to view this feed</div>;
  return (
    <Box maxWidth={800} mx="auto">
      <ToggleButtonGroup
        value={feedType}
        exclusive
        onChange={(_, val) => val && setFeedType(val)}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="notes">Notes</ToggleButton>
        <ToggleButton value="profiles">Profiles</ToggleButton>
        <ToggleButton value="hashtags">Hashtags</ToggleButton>
      </ToggleButtonGroup>

      {feedType === "notes" && <NotesFeed />}
      {feedType === "profiles" && <ProfilesFeed />}
      {feedType === "hashtags" && <HashtagsFeed />}
    </Box>
  );
};

export default RatingFeed;
