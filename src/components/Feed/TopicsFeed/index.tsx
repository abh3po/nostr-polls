// components/Feed/TopicsFeed.tsx
import React, { useEffect, useState } from "react";
import { Event, SimplePool } from "nostr-tools";
import { useRelays } from "../../../hooks/useRelays";
import { useNavigate, Outlet, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";

const TopicsFeed: React.FC = () => {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { relays } = useRelays();
  const seen = new Set<string>();
  const navigate = useNavigate();
  const { tag } = useParams(); // See if we're in /feeds/topics/:tag

  function parseRatingDTag(dTagValue: string): { type: string; id: string } {
    const colonIndex = dTagValue.indexOf(":");

    if (colonIndex !== -1) {
      const type = dTagValue.slice(0, colonIndex);
      const id = dTagValue.slice(colonIndex + 1);
      return { type, id };
    } else {
      return { type: "event", id: dTagValue };
    }
  }

  useEffect(() => {
    if (tag) return; // Don't fetch topics if we're inside a topic view

    const pool = new SimplePool();
    const sub = pool.subscribeMany(
      relays,
      [{ kinds: [34259], "#m": ["hashtag"], limit: 100 }],
      {
        onevent: (event: Event) => {
          const dTag = event.tags.find((t) => t[0] === "d");
          if (dTag && !seen.has(dTag[1])) {
            seen.add(dTag[1]);
            setTags((prev) => [...prev, dTag[1]]);
          }
        },
        oneose: () => {
          setLoading(false);
          sub.close();
        },
      }
    );

    return () => sub.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag]);

  // 👉 If viewing a specific topic, only render nested route
  if (tag) {
    return <Outlet />;
  }

  return (
    <Box sx={{ px: 2, py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Discover Topics
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : tags.length === 0 ? (
        <Typography>No topics found yet.</Typography>
      ) : (
        tags.map((tag) => {
          const parsed = parseRatingDTag(tag);
          if (parsed.type !== "hashtag") return null;

          return (
            <Card
              key={parsed.id}
              variant="outlined"
              sx={{ mb: 2, cursor: "pointer" }}
              onClick={() => navigate(`/feeds/topics/${parsed.id}`)}
            >
              <CardContent>
                <Typography variant="h6">#{parsed.id}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Click to explore notes and polls about this topic.
                </Typography>
              </CardContent>
            </Card>
          );
        })
      )}
    </Box>
  );
};

export default TopicsFeed;
