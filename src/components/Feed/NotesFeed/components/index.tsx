import React, { useState, lazy, Suspense } from "react";
import { Typography, CircularProgress } from "@mui/material";
import RateEventModal from "../../../Ratings/RateEventModal";
import NotesFeedTabs from "./NotesFeedTabs";

const FollowingFeed = lazy(() => import("./FollowingFeed"));
const ReactedFeed = lazy(() => import("./ReactedFeed"));
const DiscoverFeed = lazy(() => import("./DiscoverFeed")); // 🆕

const NotesFeed = () => {
  const [activeTab, setActiveTab] = useState<
    "following" | "reacted" | "discover"
  >("discover");
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <NotesFeedTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <Typography sx={{ mt: 2 }}>
        {activeTab === "following"
          ? "Notes from people you follow"
          : activeTab === "reacted"
          ? "Notes reacted to by contacts"
          : "Discover new posts from friends of friends"}
      </Typography>

      <Suspense fallback={<CircularProgress sx={{ m: 4 }} />}>
        {activeTab === "following" ? (
          <FollowingFeed />
        ) : activeTab === "reacted" ? (
          <ReactedFeed />
        ) : (
          <DiscoverFeed />
        )}
      </Suspense>

      <RateEventModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default NotesFeed;
