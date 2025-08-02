import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
} from "@mui/material";
import { SimplePool, Event } from "nostr-tools";
import { useRelays } from "../../../hooks/useRelays";
import { useUserContext } from "../../../hooks/useUserContext";
import { Notes } from "../../Notes/index";
import PollResponseForm from "../../PollResponse/PollResponseForm";
import { ArrowBack } from "@mui/icons-material";
import { Virtuoso } from "react-virtuoso";
import Rate from "../../../components/Ratings/Rate";

const TopicExplorer: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const { relays } = useRelays();
  const { user } = useUserContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [curationMap, setCurationMap] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"uncurated" | "curated">(
    "uncurated"
  );
  const [tabValue, setTabValue] = useState<0 | 1>(0); // 0 = Notes, 1 = Polls

  const seenEventIds = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    if (!tag || !relays.length) return;
    if (events.length !== 0) return;
    const pool = new SimplePool();
    const curatedOffTopic = new Set<string>();
    setLoading(true);
    seenEventIds.current.clear();

    const filters = [
      {
        kinds: [1, 1068],
        "#t": [tag],
        limit: 50,
      },
      {
        kinds: [40009],
        "#t": [tag],
        authors: user?.follows,
        limit: 50,
      },
    ];

    const sub = pool.subscribeMany(relays, filters, {
      onevent: (event) => {
        setLoading(false);

        if (event.kind === 40009) {
          const taggedEvent = event.tags.find((t) => t[0] === "e")?.[1];
          if (taggedEvent) {
            curatedOffTopic.add(taggedEvent);
            setCurationMap(new Set(curatedOffTopic));
          }
        } else {
          if (!seenEventIds.current.has(event.id)) {
            seenEventIds.current.add(event.id);
            setEvents((prev) => [...prev, event]);
          }
        }
      },
    });

    return () => sub.close();
  }, [tag, relays, user?.follows]);

  const filteredEvents = useMemo(() => {
    const base =
      viewMode === "curated"
        ? events.filter((e) => !curationMap.has(e.id))
        : events;

    return base.sort((a, b) => b.created_at - a.created_at);
  }, [events, viewMode, curationMap]);

  const tabFilteredEvents = useMemo(() => {
    return filteredEvents.filter((e) =>
      tabValue === 0 ? e.kind === 1 : e.kind === 1068
    );
  }, [filteredEvents, tabValue]);

  const handleToggle = (
    _: React.MouseEvent<HTMLElement>,
    newMode: "uncurated" | "curated" | null
  ) => {
    if (newMode) setViewMode(newMode);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue as 0 | 1);
  };

  return (
    <Box sx={{ px: 2, py: 4 }}>
      <Button
        variant="outlined"
        startIcon={<ArrowBack />}
        onClick={() => navigate("/feeds/topics")}
        sx={{ mb: 2 }}
      >
        Back to Topics
      </Button>

      <Typography variant="h4" gutterBottom>
        Topic: #{tag}
      </Typography>
      <Rate entityId={tag!} entityType={"hashtag"} />
      {/* <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={handleToggle}
        aria-label="view mode"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="uncurated">Uncurated</ToggleButton>
        <ToggleButton value="curated">Curated by your follows</ToggleButton>
      </ToggleButtonGroup> */}

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="notes and polls tab"
        sx={{ mb: 2 }}
      >
        <Tab label="Notes" />
        <Tab label="Polls" />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : tabFilteredEvents.length === 0 ? (
        <Typography>
          No {tabValue === 0 ? "notes" : "polls"} found for this topic.
        </Typography>
      ) : (
        <Virtuoso
          data={tabFilteredEvents}
          itemContent={(_, event) => {
            if (event.kind === 1) {
              return <Notes key={event.id} event={event} />;
            } else if (event.kind === 1068) {
              return <PollResponseForm key={event.id} pollEvent={event} />;
            } else {
              return null;
            }
          }}
          style={{ height: "100vh" }}
          followOutput={false}
        />
      )}
    </Box>
  );
};

export default TopicExplorer;
