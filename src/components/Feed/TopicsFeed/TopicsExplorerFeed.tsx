// pages/TopicExplorer.tsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { SimplePool, Event } from "nostr-tools";
import { useRelays } from "../../../hooks/useRelays";
import { useUserContext } from "../../../hooks/useUserContext";
import { Notes } from "../../Notes/index";
import PollResponseForm from "../../PollResponse/PollResponseForm";

const TopicExplorer: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const { relays } = useRelays();
  const { user } = useUserContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [curationMap, setCurationMap] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"uncurated" | "curated">("uncurated");

  const seenEventIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!tag) return;

    const pool = new SimplePool();
    const fetchedEvents: Event[] = [];
    const curatedOffTopic = new Set<string>();

    setLoading(true);

    const filters = [
      {
        kinds: [1, 1068],
        "#t": [tag],
        limit: 20,
      },
      {
        kinds: [40009], // CurationEvents
        "#t": [tag],
        authors: user?.follows,
        limit: 20,
      },
    ];

    const sub = pool.subscribeMany(relays, filters, {
      onevent: (event) => {
        if (event.kind === 40009) {
          const taggedEvent = event.tags.find((t) => t[0] === "e")?.[1];
          if (taggedEvent) {
            curatedOffTopic.add(taggedEvent);
          }
        } else {
          if (!seenEventIds.current.has(event.id)) {
            seenEventIds.current.add(event.id);
            fetchedEvents.push(event);
          }
        }
      },
      oneose: () => {
        setCurationMap(curatedOffTopic);
        setEvents(fetchedEvents);
        setLoading(false);
        sub.close();
      },
    });

    return () => sub.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, relays, user?.follows]);

  const filteredEvents =
    viewMode === "curated"
      ? events.filter((e) => !curationMap.has(e.id))
      : events;

  const handleToggle = (
    _: React.MouseEvent<HTMLElement>,
    newMode: "uncurated" | "curated" | null
  ) => {
    if (newMode) setViewMode(newMode);
  };

  return (
    <Box sx={{ px: 2, py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Topic: #{tag}
      </Typography>

      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={handleToggle}
        aria-label="view mode"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="uncurated">Uncurated</ToggleButton>
        <ToggleButton value="curated">Curated by your follows</ToggleButton>
      </ToggleButtonGroup>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : filteredEvents.length === 0 ? (
        <Typography>No posts or polls found for this topic.</Typography>
      ) : (
        filteredEvents.map((event) => {
          if (event.kind === 1) {
            return <Notes key={event.id} event={event} />;
          } else if (event.kind === 1068) {
            return <PollResponseForm key={event.id} pollEvent={event} />;
          } else {
            return null;
          }
        })
      )}
    </Box>
  );
};

export default TopicExplorer;
