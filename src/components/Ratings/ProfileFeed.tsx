import React, { useEffect, useState } from "react";
import { Event, SimplePool } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import ProfileCard from "./ProfileCard";
import { useUserContext } from "../../hooks/useUserContext";
import { Button, CircularProgress } from "@mui/material";

const BATCH_SIZE = 30;

const ProfilesFeed: React.FC = () => {
  const [profiles, setProfiles] = useState<Map<string, Event>>(new Map());
  const [loadingMore, setLoadingMore] = useState(false);
  const [until, setUntil] = useState<number | undefined>(undefined); // for pagination
  const { user } = useUserContext();

  const fetchProfiles = () => {
    if (!user || !user.follows || user.follows.length === 0) return;
    setLoadingMore(true);

    const pool = new SimplePool();
    let receivedCount = 0;

    const filter = {
      kinds: [0],
      authors: Array.from(user.follows),
      ...(until && { until }),
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
      {sortedProfiles.map((e) => (
        <ProfileCard key={e.id} event={e} />
      ))}
      <div style={{ textAlign: "center", margin: 20 }}>
        <Button
          onClick={fetchProfiles}
          variant="contained"
          disabled={loadingMore}
        >
          {loadingMore ? <CircularProgress size={24} /> : "Load More"}
        </Button>
      </div>
    </>
  );
};

export default ProfilesFeed;
