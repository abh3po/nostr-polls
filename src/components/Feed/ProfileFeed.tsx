import React, { useEffect, useState } from "react";
import { Event, SimplePool } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import ProfileCard from "../Profile/ProfileCard";
import { useUserContext } from "../../hooks/useUserContext";
import {
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";
import RateProfileModal from "../Ratings/RateProfileModal";

const BATCH_SIZE = 20;

const ProfilesFeed: React.FC = () => {
  const [profiles, setProfiles] = useState<Map<string, Event>>(new Map());
  const [loadingMore, setLoadingMore] = useState(false);
  const [until, setUntil] = useState<number | undefined>(undefined); // for pagination
  const [modalOpen, setModalOpen] = useState(false);
  const { user, requestLogin } = useUserContext();

  const fetchProfiles = () => {
    if (!user || !user.follows || user.follows.length === 0) return;
    setLoadingMore(true);

    const pool = new SimplePool();
    let receivedCount = 0;

    const filter = {
      kinds: [0],
      authors: Array.from(user.follows),
      ...(until && { until }),
      limit: 10,
    };

    const sub = pool.subscribeMany(defaultRelays, [filter], {
      onevent: (event) => {
        setProfiles((prev) => {
          if (prev.has(event.pubkey)) return prev;

          const updated = new Map(prev);
          updated.set(event.pubkey, event);

          // Track the oldest timestamp for pagination
          if (!until || event.created_at < until) {
            setUntil(event.created_at);
          }

          return updated;
        });

        receivedCount++;
        if (receivedCount >= BATCH_SIZE) {
          sub.close();
          setLoadingMore(false);
        }
      },
      oneose: () => {
        sub.close();
        setLoadingMore(false);
      },
    });
  };

  useEffect(() => {
    fetchProfiles(); // initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const sortedProfiles = Array.from(profiles.values()).sort(
    (a, b) => b.created_at - a.created_at
  );

  return (
    <>
      <Card
        onClick={() => setModalOpen(true)}
        sx={{ cursor: "pointer", mb: 2 }}
        variant="outlined"
      >
        <CardContent>
          <Typography variant="h6">Rate any profile</Typography>
          <Typography variant="body2" color="text.secondary">
            Click to enter an npub and rate someone outside your feed.
          </Typography>
        </CardContent>
      </Card>

      <Typography>People you follow</Typography>
      {sortedProfiles.map((e) => (
        <ProfileCard key={e.id} event={e} />
      ))}
      <div style={{ textAlign: "center", margin: 20 }}>
        <Button
          onClick={!!user ? fetchProfiles : requestLogin}
          variant="contained"
          disabled={loadingMore}
        >
          {loadingMore ? (
            <CircularProgress size={24} />
          ) : !!user ? (
            "Load More"
          ) : (
            "login"
          )}
        </Button>
      </div>
      <RateProfileModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default ProfilesFeed;
