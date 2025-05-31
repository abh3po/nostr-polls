import React, { useState, lazy, Suspense } from "react";
import { Typography, CircularProgress } from "@mui/material";
import RateEventCard from "../../../Ratings/RateEventCard";
import RateEventModal from "../../../Ratings/RateEventModal";
import NotesFeedTabs from "./NotesFeedTabs";

const FollowingFeed = lazy(() => import("./FollowingFeed"));
const ReactedFeed = lazy(() => import("./ReactedFeed"));

const NotesFeed = () => {
  const [activeTab, setActiveTab] = useState<"following" | "reacted">("following");
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <NotesFeedTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <RateEventCard onClick={() => setModalOpen(true)} />

      <Typography sx={{ mt: 2 }}>
        {activeTab === "following"
          ? "Notes from people you follow"
          : "Notes reacted to by contacts"}
      </Typography>

      <Suspense fallback={<CircularProgress sx={{ m: 4 }} />}>
        {activeTab === "following" ? <FollowingFeed /> : <ReactedFeed />}
      </Suspense>

      <RateEventModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default NotesFeed;
