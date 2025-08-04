import React, { useEffect, useState, useRef } from "react";
import { Event, Filter } from "nostr-tools";
import { useRelays } from "../../../hooks/useRelays";
import { useNavigate, Outlet, useParams } from "react-router-dom";
import {
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { pool } from "../../../singletons";
import { Virtuoso } from "react-virtuoso";
import TopicCard from "./TopicsCard";

const TopicsFeed: React.FC = () => {
  const [tagsMap, setTagsMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [metadataMap, setMetadataMap] = useState<Map<string, Event>>(new Map());

  const { relays } = useRelays();
  const navigate = useNavigate();
  const { tag } = useParams();

  const subRef = useRef<ReturnType<typeof pool.subscribeMany> | null>(null);
  const isMounted = useRef(true);

  function parseRatingDTag(dTagValue: string): { type: string; id: string } {
    const parts = dTagValue.split(":");
    const cleanTag =
      parts.length === 2
        ? parts[1].startsWith("#")
          ? parts[1].slice(1)
          : parts[1]
        : parts[0];

    return {
      type: parts.length === 2 ? parts[0] : "event",
      id: cleanTag,
    };
  }

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      if (subRef.current) {
        subRef.current.close();
        subRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    if (tagsMap.size === 0 || relays.length === 0) return;
    const filter: Filter = {
        kinds: [30300],
        "#d": Array.from(tagsMap.keys()).map((tag) => `hashtag:${tag}`)
      };
    
    
  
    const sub = pool.subscribeMany(
      relays,
      [filter],
      {
        onevent: (event) => {
          const dTag = event.tags.find((t) => t[0] === "d");
          if (!dTag || !dTag[1].startsWith("hashtag:")) return;
  
          const topicName = dTag[1].split(":")[1];
          setMetadataMap((prev) => {
            if (prev.has(topicName)) return prev;
            const updated = new Map(prev);
            updated.set(topicName, event);
            return updated;
          });
        },
      }
    );
  
    return () => sub.close();
  }, [relays, tagsMap]);

  useEffect(() => {
    // If a specific tag is selected or no relays, don't fetch topics
    if (tag || relays.length === 0) return;

    setLoading(true);

    if (subRef.current) {
      subRef.current.close();
      subRef.current = null;
    }

    // Subscribe once
    const sub = pool.subscribeMany(
      relays,
      [{ kinds: [34259], "#m": ["hashtag"], limit: 100 }],
      {
        onevent: (event: Event) => {
          setLoading(false);
          const dTag = event.tags.find((t) => t[0] === "d");
          const parsedDTag = dTag ? parseRatingDTag(dTag[1]) : null;

          if (parsedDTag && parsedDTag.type === "hashtag") {
            const id = parsedDTag.id;

            setTagsMap((prev) => {
              const currentTimestamp = prev.get(id) || 0;
              if (event.created_at > currentTimestamp) {
                const updated = new Map(prev);
                updated.set(id, event.created_at);
                return updated;
              }
              return prev;
            });
          }
        },
        oneose: () => {
          if (isMounted.current) setLoading(false);
        },
      }
    );

    subRef.current = sub;

    // Timeout to stop loading even if no oneose event
    const timeout = setTimeout(() => {
      if (isMounted.current) setLoading(false);
      if (subRef.current) {
        subRef.current.close();
        subRef.current = null;
      }
    }, 5000);

    return () => {
      clearTimeout(timeout);
      if (subRef.current) {
        subRef.current.close();
        subRef.current = null;
      }
    };
  }, [tag, relays]);

  const handleSearchSubmit = () => {
    if (searchTerm.trim()) {
      setSearchOpen(false);
      navigate(`/feeds/topics/${searchTerm.trim()}`);
    }
  };

  if (tag) return <Outlet />;

  const tags = Array.from(tagsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  return (
    <Box
      sx={{
        px: 2,
        py: 4,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" gutterBottom>
          Discover Topics
        </Typography>
        <IconButton
          onClick={() => setSearchOpen(true)}
          aria-label="Search topics"
        >
          <SearchIcon />
        </IconButton>
      </Box>

      <Typography style={{ fontSize: 12}} gutterBottom>
        Recently Rated
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : tags.length === 0 ? (
        <Typography>No topics found yet.</Typography>
      ) : (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <Virtuoso
            data={tags}
            itemContent={(index, tag) => (
              <TopicCard tag={tag} metadataEvent={metadataMap.get(tag)} />
            )}
          />
        </Box>
      )}

      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} fullWidth>
        <DialogTitle>Search Topic</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Enter topic name"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearchSubmit();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSearchOpen(false)}>Cancel</Button>
          <Button onClick={handleSearchSubmit}>Search</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TopicsFeed;
