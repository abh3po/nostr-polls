import React, { useEffect, useRef, useState } from "react";
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
  const tagsSet = useRef<Set<string>>(new Set());
  const [refresh, setRefresh] = useState(0); // just to trigger re-render
  const [loading, setLoading] = useState(true);
  const { relays } = useRelays();
  const navigate = useNavigate();
  const { tag } = useParams();

  function parseRatingDTag(dTagValue: string): { type: string; id: string } {
    const ratingDTagArray = dTagValue.split(":");
    const cleanTag =
      ratingDTagArray.length === 2
        ? ratingDTagArray[1].startsWith("#")
          ? ratingDTagArray[1].slice(1)
          : ratingDTagArray[1]
        : ratingDTagArray[0];

    if (ratingDTagArray.length === 2) {
      return { type: ratingDTagArray[0], id: cleanTag };
    } else {
      return { type: "event", id: cleanTag };
    }
  }

  useEffect(() => {
    if (tag || relays.length === 0) return;

    const pool = new SimplePool();

    const sub = pool.subscribeMany(
      relays,
      [{ kinds: [34259], "#m": ["hashtag"], limit: 100 }],
      {
        onevent: (event: Event) => {
          const dTag = event.tags.find((t) => t[0] === "d");
          const parsedDTag = dTag ? parseRatingDTag(dTag[1]) : null;

          if (parsedDTag && parsedDTag.type === "hashtag") {
            const id = parsedDTag.id;
            if (!tagsSet.current.has(id)) {
              tagsSet.current.add(id);
              setRefresh((r) => r + 1); // trigger rerender
            }
          }
        },
        oneose: () => {
          setLoading(false);
          sub.close();
        },
      }
    );

    const timeout = setTimeout(() => {
      setLoading(false);
      sub.close();
    }, 5000);

    return () => {
      clearTimeout(timeout);
      sub.close();
    };
  }, [tag, relays]);

  if (tag) return <Outlet />;

  const tags = Array.from(tagsSet.current);

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
        tags.map((tag) => (
          <Card
            key={tag}
            variant="outlined"
            sx={{ mb: 2, cursor: "pointer" }}
            onClick={() => navigate(`/feeds/topics/${tag}`)}
          >
            <CardContent>
              <Typography variant="h6">#{tag}</Typography>
              <Typography variant="body2" color="text.secondary">
                Click to explore notes and polls about this topic.
              </Typography>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
};

export default TopicsFeed;
