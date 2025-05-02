import React, { useEffect, useState } from "react";
import { Event, SimplePool } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import HashtagCard from "./HashtagCard";
import RateHashtagModal from "./RateHashtagModal";
import {
  Button,
  Box,
  Card,
  CardContent,
  Typography,
  CardActionArea,
} from "@mui/material";

const HashtagsFeed: React.FC = () => {
  const [tags, setTags] = useState<string[]>([]);
  const seen = new Set<string>();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const pool = new SimplePool();
    const sub = pool.subscribeMany(
      defaultRelays,
      [{ kinds: [34259], "#m": ["hashtag"] }],
      {
        onevent: (event: Event) => {
          const dTag = event.tags.find((t) => t[0] === "d");
          if (dTag && !seen.has(dTag[1])) {
            seen.add(dTag[1]);
            setTags((prev) => [...prev, dTag[1]]);
          }
        },
      }
    );

    return () => sub.close();
  }, []);

  return (
    <>
      <Card
        variant="outlined"
        sx={{ mb: 2 }}
        onClick={() => setModalOpen(true)}
      >
        <CardContent>
          <Typography variant="h6">Rate Any Hashtag</Typography>
          <Typography variant="body2" color="text.secondary">
            Click to enter a hashtag and submit a rating.
          </Typography>
        </CardContent>
      </Card>
      {tags.map((tag) => (
        <HashtagCard key={tag} tag={tag} />
      ))}
      <RateHashtagModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default HashtagsFeed;
