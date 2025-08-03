import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
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
  const navigate = useNavigate();

  const [notesEvents, setNotesEvents] = useState<Event[]>([]);
  const [pollsEvents, setPollsEvents] = useState<Event[]>([]);
  const [curationMap, setCurationMap] = useState<Set<string>>(new Set());
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [tabValue, setTabValue] = useState<0 | 1>(0); // 0 = Notes, 1 = Polls

  const curatedOffTopic = useRef<Set<string>>(new Set());
  const seenNoteIds = useRef<Set<string>>(new Set());
  const seenPollIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!tag || !relays.length) return;

    const pool = new SimplePool();
    const filters = [];

    if (tabValue === 0 && notesEvents.length === 0) {
      filters.push({
        kinds: [1],
        "#t": [tag],
        limit: 50,
      });
      setLoadingNotes(true);
    }

    if (tabValue === 1 && pollsEvents.length === 0) {
      filters.push({
        kinds: [1068],
        "#t": [tag],
        limit: 50,
      });
      setLoadingPolls(true);
    }

    // Always fetch curation metadata
    filters.push({
      kinds: [40009],
      "#t": [tag],
      authors: user?.follows,
      limit: 50,
    });

    const sub = pool.subscribeMany(relays, filters, {
      onevent: (event) => {
        if (event.kind === 40009) {
          const taggedEvent = event.tags.find((t) => t[0] === "e")?.[1];
          if (taggedEvent) {
            curatedOffTopic.current.add(taggedEvent);
            setCurationMap(new Set(curatedOffTopic.current));
          }
          return;
        }

        if (event.kind === 1 && !seenNoteIds.current.has(event.id)) {
          seenNoteIds.current.add(event.id);
          setNotesEvents((prev) => [...prev, event]);
          setLoadingNotes(false);
        }

        if (event.kind === 1068 && !seenPollIds.current.has(event.id)) {
          seenPollIds.current.add(event.id);
          setPollsEvents((prev) => [...prev, event]);
          setLoadingPolls(false);
        }
      },
      onclose: () => {
        setLoadingNotes(false);
        setLoadingPolls(false);
      },
    });

    return () => sub.close();
  }, [
    tag,
    relays,
    user?.follows,
    tabValue,
  ]);

  const filteredEvents = useMemo(() => {
    const base = tabValue === 0 ? notesEvents : pollsEvents;
    return base
      .filter((e) => !curationMap.has(e.id))
      .sort((a, b) => b.created_at - a.created_at);
  }, [tabValue, notesEvents, pollsEvents, curationMap]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue as 0 | 1);
  };

  const loading = tabValue === 0 ? loadingNotes : loadingPolls;

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

      {/* Future toggle (optional) */}
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
      ) : filteredEvents.length === 0 ? (
        <Typography>
          No {tabValue === 0 ? "notes" : "polls"} found for this topic.
        </Typography>
      ) : (
        <Virtuoso
          data={filteredEvents}
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
