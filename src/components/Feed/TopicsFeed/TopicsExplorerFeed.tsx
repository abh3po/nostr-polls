import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Tabs,
  Tab,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { Event, SimplePool } from "nostr-tools";
import { useUserContext } from "../../../hooks/useUserContext";
import { useRelays } from "../../../hooks/useRelays";
import { Notes } from "../../Notes";
import PollResponseForm from "../../PollResponse/PollResponseForm";
import Rate from "../../../components/Ratings/Rate";
import { Virtuoso } from "react-virtuoso";
import OverlappingAvatars from "../../../components/Common/OverlappingAvatars";
import { signEvent } from "../../../nostr";
import { pool } from "../../../singletons";
import { useMetadata } from "../../../hooks/MetadataProvider";
import { selectBestMetadataEvent } from "../../../utils/utils";

const OFFTOPIC_KIND = 1011;

const TopicExplorer: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const { relays } = useRelays();
  const { user, requestLogin } = useUserContext();
  const { metadata } = useMetadata();
  const navigate = useNavigate();

  const [tabValue, setTabValue] = useState<0 | 1>(0);
  const [feedMode, setFeedMode] = useState<
    "unfiltered" | "global" | "contacts"
  >("global");
  const [notesEvents, setNotesEvents] = useState<Event[]>([]);
  const [pollsEvents, setPollsEvents] = useState<Event[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingPolls, setLoadingPolls] = useState(false);

  const curatedByMap = useRef<Map<string, Set<string>>>(new Map());
  const [curatedIds, setCuratedIds] = useState<Set<string>>(new Set());
  const [showAnywaySet, setShowAnywaySet] = useState<Set<string>>(new Set());

  const seenNoteIds = useRef<Set<string>>(new Set());
  const seenPollIds = useRef<Set<string>>(new Set());
  const hasSubscribed = useRef({ notes: false, polls: false, curated: false });

  const topicMetadataEvent = useMemo(() => {
    const events = metadata.get(tag ?? "") ?? [];
    return selectBestMetadataEvent(events, user?.follows);
  }, [metadata, tag, user?.follows]);

  const tagMap: Record<string, string> = {};
  topicMetadataEvent?.tags.forEach(([key, val]) => {
    if (key && val) tagMap[key] = val;
  });

  const topicImage = tagMap["image"];
  const topicDescription = tagMap["description"];

  const toggleShowAnyway = (id: string) => {
    setShowAnywaySet((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

  const handleMarkOffTopic = async (noteEvent: Event) => {
    if (!user) return requestLogin();
    if (!tag) return;

    const tags = [
      ["e", noteEvent.id],
      ["t", tag],
    ];

    const unsignedEvent = {
      kind: OFFTOPIC_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: "Marked as off-topic",
      pubkey: user.pubkey,
    };

    const signed = await signEvent(unsignedEvent);
    await pool.publish(relays, signed);

    // Manually update the curated map so UI reflects immediately
    if (!curatedByMap.current.has(noteEvent.id)) {
      curatedByMap.current.set(noteEvent.id, new Set());
    }
    curatedByMap.current.get(noteEvent.id)!.add(user.pubkey);
    setCuratedIds(new Set(curatedByMap.current.keys()));
  };

  const subRef = useRef<ReturnType<SimplePool["subscribeMany"]> | null>(null);

  useEffect(() => {
    if (!tag || relays.length === 0) return;

    subRef.current?.close();

    const filters = [
      { kinds: [OFFTOPIC_KIND], "#t": [tag], limit: 200 },
      { kinds: [1], "#t": [tag], limit: 50 },
      { kinds: [1068], "#t": [tag], limit: 50 },
    ];

    const sub = pool.subscribeMany(relays, filters, {
      onevent: (event) => {
        if (event.kind === OFFTOPIC_KIND) {
          const eTags = event.tags.filter((t) => t[0] === "e").map((t) => t[1]);
          for (const e of eTags) {
            if (!curatedByMap.current.has(e)) {
              curatedByMap.current.set(e, new Set());
            }
            curatedByMap.current.get(e)!.add(event.pubkey);
          }
          setCuratedIds(new Set(curatedByMap.current.keys()));
          return;
        }

        if (event.kind === 1 && !seenNoteIds.current.has(event.id)) {
          seenNoteIds.current.add(event.id);
          setNotesEvents((prev) => [...prev, event]);
        }

        if (event.kind === 1068 && !seenPollIds.current.has(event.id)) {
          seenPollIds.current.add(event.id);
          setPollsEvents((prev) => [...prev, event]);
        }
      },
      onclose: () => {
        setLoadingNotes(false);
        setLoadingPolls(false);
      },
    });

    subRef.current = sub;

    return () => {
      sub.close();
    };
  }, [tag, relays]);

  const sortedEvents = useMemo(() => {
    const base = tabValue === 0 ? notesEvents : pollsEvents;
    return base.sort((a, b) => b.created_at - a.created_at);
  }, [tabValue, notesEvents, pollsEvents]);

  const loading = tabValue === 0 ? loadingNotes : loadingPolls;

  const itemContent = useMemo(
    () => (_: any, event: Event) => {
      const allCurators =
        curatedByMap.current.get(event.id) ?? new Set<string>();

      // Filter curators based on feed mode
      const visibleCurators =
        feedMode === "contacts" && user?.follows
          ? Array.from(allCurators).filter((id) => user.follows!.includes(id))
          : Array.from(allCurators);

      const isHidden =
        feedMode !== "unfiltered" &&
        visibleCurators.length > 0 &&
        !showAnywaySet.has(event.id);

      const showReason =
        visibleCurators.length > 0 ? (
          <Box>
            <Typography style={{ margin: 10 }}>
              Marked as off-topic by:
            </Typography>
            <div style={{ marginTop: 30 }}>
              <OverlappingAvatars ids={visibleCurators} maxAvatars={3} />
            </div>
            <Button
              size="small"
              variant="text"
              sx={{ mt: 1 }}
              onClick={() => toggleShowAnyway(event.id)}
            >
              <Typography style={{ marginTop: 10 }}>Show Anyway</Typography>
            </Button>
          </Box>
        ) : undefined;

      return (
        <Box sx={{ position: "relative" }}>
          {event.kind === 1 ? (
            <Notes
              event={event}
              hidden={isHidden}
              showReason={showReason}
              extras={
                <>
                  {!allCurators.has(user?.pubkey || "") && (
                    <MenuItem onClick={() => handleMarkOffTopic(event)}>
                      Mark Off-Topic
                    </MenuItem>
                  )}
                  {feedMode !== "unfiltered" &&
                    showAnywaySet.has(event.id) &&
                    visibleCurators.length > 0 && (
                      <MenuItem onClick={() => toggleShowAnyway(event.id)}>
                        Hide Again
                      </MenuItem>
                    )}
                </>
              }
            />
          ) : (
            <>
              <PollResponseForm pollEvent={event} />
              {feedMode !== "unfiltered" &&
                showAnywaySet.has(event.id) &&
                visibleCurators.length > 0 && (
                  <Box sx={{ ml: 2, mt: 1 }}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => toggleShowAnyway(event.id)}
                    >
                      Hide Again
                    </Button>
                  </Box>
                )}
            </>
          )}
        </Box>
      );
    },
    [curatedIds, feedMode, showAnywaySet, user?.follows, user?.pubkey]
  );

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

      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        {topicImage && (
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 1,
              overflow: "hidden",
              mr: 2,
              flexShrink: 0,
            }}
          >
            <img
              src={topicImage}
              alt={tag}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
        )}
        <Box>
          <Typography variant="h5">#{tag}</Typography>
          {topicDescription && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, fontStyle: "italic" }}
            >
              {topicDescription}
            </Typography>
          )}
        </Box>
      </Box>

      <Rate entityId={tag!} entityType="hashtag" />

      <FormControl sx={{ mt: 2, mb: 1 }} size="small">
        <InputLabel>Feed Mode</InputLabel>
        <Select
          value={feedMode}
          label="Feed Mode"
          onChange={(e: SelectChangeEvent) => {
            if (!user && e.target.value === "contacts") return;
            setFeedMode(e.target.value as typeof feedMode);
          }}
        >
          <MenuItem value="unfiltered">Unfiltered</MenuItem>
          <MenuItem value="global">Filtered (Global)</MenuItem>
          <MenuItem
            value="contacts"
            onClick={(e: any) => {
              if (!user) {
                requestLogin();
                return;
              } else {
                setFeedMode("contacts");
              }
            }}
            sx={{
              color: !user ? "text.disabled" : "inherit",
              pointerEvents: "auto",
              opacity: !user ? 0.5 : 1,
            }}
          >
            Filtered (My Contacts)
          </MenuItem>
        </Select>
      </FormControl>

      <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)}>
        <Tab label="Notes" />
        <Tab label="Polls" />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : sortedEvents.length === 0 ? (
        <Typography>No content found for this topic.</Typography>
      ) : (
        <Virtuoso
          data={sortedEvents}
          itemContent={itemContent}
          style={{ height: "100vh" }}
          followOutput={false}
        />
      )}
    </Box>
  );
};

export default TopicExplorer;
