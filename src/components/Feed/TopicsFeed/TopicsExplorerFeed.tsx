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
  IconButton,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useNavigate, useParams } from "react-router-dom";
import { Event, SimplePool } from "nostr-tools";
import { useUserContext } from "../../../hooks/useUserContext";
import { useRelays } from "../../../hooks/useRelays";
import { Notes } from "../../Notes";
import PollResponseForm from "../../PollResponse/PollResponseForm";
import Rate from "../../../components/Ratings/Rate";
import { Virtuoso } from "react-virtuoso";
import type { VirtuosoHandle } from "react-virtuoso";
import useTopicExplorerScroll from "../../../hooks/useTopicExplorerScroll";
import OverlappingAvatars from "../../../components/Common/OverlappingAvatars";
import { signEvent } from "../../../nostr";
import { pool, nostrRuntime } from "../../../singletons";
import { useMetadata } from "../../../hooks/MetadataProvider";
import { selectBestMetadataEvent } from "../../../utils/utils";
import {
  loadModeratorPrefs,
  saveModeratorPrefs,
} from "../../../utils/localStorage";
import ModeratorSelectorDialog from "../../../components/Moderator/ModeratorSelectorDialog";
import { useListContext } from "../../../hooks/useListContext";
import { signerManager } from "../../../singletons/Signer/SignerManager";

const OFFTOPIC_KIND = 1011;

const TopicExplorer: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const { relays } = useRelays();
  const { user, requestLogin } = useUserContext();
  const { metadata } = useMetadata();
  const { myTopics, addTopicToMyTopics, removeTopicFromMyTopics } =
    useListContext();
  const navigate = useNavigate();

  const [tabValue, setTabValue] = useState<0 | 1>(0);
  const [feedMode, setFeedMode] = useState<
    "unfiltered" | "global" | "contacts"
  >("global");
  const [notesEvents, setNotesEvents] = useState<Event[]>([]);
  const [pollsEvents, setPollsEvents] = useState<Event[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [isAddingToMyTopics, setIsAddingToMyTopics] = useState(false);

  const curatedByMap = useRef<Map<string, Set<string>>>(new Map());
  const [curatedIds, setCuratedIds] = useState<Set<string>>(new Set());
  const [showAnywaySet, setShowAnywaySet] = useState<Set<string>>(new Set());

  const seenNoteIds = useRef<Set<string>>(new Set());
  const seenPollIds = useRef<Set<string>>(new Set());
  const blockedUsersMap = useRef<Map<string, Set<string>>>(new Map());
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [moderatorDialogOpen, setModeratorDialogOpen] = useState(false);
  const [visibleModerators, setVisibleModerators] = useState<string[]>([]);

  const topicMetadataEvent = useMemo(() => {
    const events = metadata.get(tag ?? "") ?? [];
    return selectBestMetadataEvent(events, user?.follows);
  }, [metadata, tag, user?.follows]);

  const isInMyTopics = myTopics?.has(tag ?? "") ?? false;

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

  const handleAddToMyTopics = async () => {
    if (!user) {
      requestLogin();
      return;
    }

    if (!tag) return;

    setIsAddingToMyTopics(true);
    try {
      const signer = await signerManager.getSigner();
      await addTopicToMyTopics(tag);
    } catch (error) {
      console.error("Failed to add topic to my topics:", error);
    } finally {
      setIsAddingToMyTopics(false);
    }
  };

  const handleRemoveFromMyTopics = async () => {
    if (!user) {
      requestLogin();
      return;
    }

    if (!tag) return;

    try {
      const signer = await signerManager.getSigner();
      await removeTopicFromMyTopics(tag);
    } catch (error) {
      console.error("Failed to remove topic:", error);
    }
  };

  const allModerators = useMemo(() => {
    const modSet = new Set<string>();
    curatedByMap.current.forEach((curators) => {
      curators.forEach((id) => modSet.add(id));
    });
    blockedUsersMap.current.forEach((blockers) => {
      blockers.forEach((id) => modSet.add(id));
    });
    return Array.from(modSet);
  }, [curatedIds, blockedUserIds]);

  useEffect(() => {
    if (!tag) return;
    setVisibleModerators(loadModeratorPrefs(tag, allModerators));
  }, [tag, allModerators]);

  const handleModerationEvent = async (
    noteEvent: Event,
    type: "off-topic" | "remove-user"
  ) => {
    if (!user) return requestLogin();
    if (!tag) return;

    const tags = [
      ["t", tag],
      type === "off-topic" ? ["e", noteEvent.id] : ["p", noteEvent.pubkey],
    ];

    const unsignedEvent = {
      kind: OFFTOPIC_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content:
        type === "off-topic"
          ? "Marked as off-topic"
          : "Removed user from topic",
      pubkey: user.pubkey,
    };

    const signed = await signEvent(unsignedEvent);
    await pool.publish(relays, signed);

    if (type === "off-topic") {
      if (!curatedByMap.current.has(noteEvent.id)) {
        curatedByMap.current.set(noteEvent.id, new Set());
      }
      curatedByMap.current.get(noteEvent.id)!.add(user.pubkey);
      setCuratedIds(new Set(curatedByMap.current.keys()));
    } else {
      const blocked = blockedUsersMap.current;
      if (!blocked.has(noteEvent.pubkey)) {
        blocked.set(noteEvent.pubkey, new Set());
      }
      blocked.get(noteEvent.pubkey)!.add(user.pubkey);
      setBlockedUserIds(new Set(blocked.keys()));
    }
  };

  const subRef = useRef<ReturnType<SimplePool["subscribeMany"]> | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useTopicExplorerScroll(containerRef, virtuosoRef, scrollContainerRef, {
    smooth: true,
  });

  useEffect(() => {
    if (!tag || relays.length === 0) return;

    subRef.current?.close();

    const filters = [
      { kinds: [OFFTOPIC_KIND], "#t": [tag], limit: 200 },
      { kinds: [1], "#t": [tag], limit: 50 },
      { kinds: [1068], "#t": [tag], limit: 50 },
    ];


    const handle = nostrRuntime.subscribe(relays, filters, {
      onEvent: (event: Event) => {
        if (event.kind === OFFTOPIC_KIND) {
          const eTags = event.tags.filter((t) => t[0] === "e").map((t) => t[1]);
          for (const e of eTags) {
            if (!curatedByMap.current.has(e)) {
              curatedByMap.current.set(e, new Set());
            }
            curatedByMap.current.get(e)!.add(event.pubkey);
          }

          const pTags = event.tags.filter((t) => t[0] === "p").map((t) => t[1]);
          for (const pubkey of pTags) {
            if (!blockedUsersMap.current.has(pubkey)) {
              blockedUsersMap.current.set(pubkey, new Set());
            }
            blockedUsersMap.current.get(pubkey)!.add(event.pubkey);
          }

          setCuratedIds(new Set(curatedByMap.current.keys()));
          setBlockedUserIds(new Set(blockedUsersMap.current.keys()));
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
    });

    // Store reference for cleanup
    subRef.current = {
      close: () => handle.unsubscribe(),
    };

    // Handle loading state after timeout
    setTimeout(() => {
      setLoadingNotes(false);
      setLoadingPolls(false);
    }, 3000);

    return () => {
      if (subRef.current) {
        subRef.current.close();
      }
    };
  }, [tag, relays]);

  const sortedEvents = useMemo(() => {
    const base = tabValue === 0 ? notesEvents : pollsEvents;
    return base.sort((a, b) => b.created_at - a.created_at);
  }, [tabValue, notesEvents, pollsEvents]);

  const visibleCurators =
    feedMode === "contacts" && user?.follows
      ? Array.from(allModerators).filter(
          (id) => user.follows!.includes(id) && visibleModerators.includes(id)
        )
      : Array.from(allModerators).filter((id) =>
          visibleModerators.includes(id)
        );
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

      const isUserBlocked =
        feedMode !== "unfiltered" &&
        blockedUserIds.has(event.pubkey) &&
        !showAnywaySet.has(event.id);

      const isHidden =
        (feedMode !== "unfiltered" &&
          visibleCurators.length > 0 &&
          !showAnywaySet.has(event.id)) ||
        isUserBlocked;

      let showReason: React.ReactNode;

      if (visibleCurators.length > 0) {
        showReason = (
          <Box>
            <Typography style={{ margin: 10 }}>
              Marked as off-topic by:
            </Typography>
            <OverlappingAvatars ids={visibleCurators} maxAvatars={3} />
            <Button
              size="small"
              variant="text"
              sx={{ mt: 1 }}
              onClick={() => toggleShowAnyway(event.id)}
            >
              <Typography style={{ marginTop: 10 }}>Show Anyway</Typography>
            </Button>
          </Box>
        );
      } else if (isUserBlocked) {
        const blockers = blockedUsersMap.current.get(event.pubkey) ?? new Set();
        const visibleBlockers =
          feedMode === "contacts" && user?.follows
            ? Array.from(blockers).filter((id) => user.follows!.includes(id))
            : Array.from(blockers);

        if (visibleBlockers.length > 0) {
          showReason = (
            <Box>
              <Typography style={{ margin: 10 }}>
                User removed from topic by:
              </Typography>
              <OverlappingAvatars ids={visibleBlockers} maxAvatars={3} />
              <Button
                size="small"
                variant="text"
                sx={{ mt: 1 }}
                onClick={() => toggleShowAnyway(event.id)}
              >
                <Typography style={{ marginTop: 10 }}>Show Anyway</Typography>
              </Button>
            </Box>
          );
        }
      }

      return (
        <Box sx={{ position: "relative" }}>
          {event.kind === 1 ? (
            <Notes
              event={event}
              hidden={isHidden}
              showReason={showReason}
              extras={
                <>
                  {!curatedByMap.current
                    .get(event.id)
                    ?.has(user?.pubkey || "") && (
                    <MenuItem
                      onClick={() => handleModerationEvent(event, "off-topic")}
                    >
                      Mark Off-Topic
                    </MenuItem>
                  )}
                  {!blockedUsersMap.current
                    .get(event.pubkey)
                    ?.has(user?.pubkey || "") && (
                    <MenuItem
                      onClick={() =>
                        handleModerationEvent(event, "remove-user")
                      }
                    >
                      Remove User From Topic
                    </MenuItem>
                  )}
                  {feedMode !== "unfiltered" &&
                  showAnywaySet.has(event.id) &&
                  (visibleCurators.length > 0 || isUserBlocked) ? (
                    <MenuItem onClick={() => toggleShowAnyway(event.id)}>
                      Hide Again
                    </MenuItem>
                  ) : null}
                </>
              }
            />
          ) : (
            <>
              <PollResponseForm pollEvent={event} />
            </>
          )}
        </Box>
      );
    },
    [curatedIds, feedMode, showAnywaySet, user?.follows, user?.pubkey]
  );

  return (
    <Box
      ref={scrollContainerRef}
      sx={{ px: 2, py: 4, height: "100vh", overflowY: "auto" }}
    >
      <Button
        variant="outlined"
        startIcon={<ArrowBack />}
        onClick={() => navigate("/feeds/topics")}
        sx={{ mb: 2 }}
      >
        Back to Topics
      </Button>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 1,
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
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
        <IconButton
          size="small"
          onClick={
            isInMyTopics ? handleRemoveFromMyTopics : handleAddToMyTopics
          }
          disabled={isAddingToMyTopics}
          title={isInMyTopics ? "Remove from my topics" : "Add to my topics"}
        >
          {isInMyTopics ? (
            <FavoriteIcon color="primary" fontSize="small" />
          ) : (
            <FavoriteBorderIcon fontSize="small" />
          )}
        </IconButton>
      </Box>

      <Rate entityId={tag!} entityType="hashtag" />
      {allModerators.length > 0 && (
        <Box
          onClick={() => setModeratorDialogOpen(true)}
          sx={{
            mt: 2,
            mb: 1,
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <Typography sx={{ mr: 1 }} variant="subtitle2">
            Moderated by:
          </Typography>
          <OverlappingAvatars ids={visibleModerators} maxAvatars={5} />
        </Box>
      )}

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

      <div ref={containerRef} style={{ height: "100vh" }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : sortedEvents.length === 0 ? (
          <Typography>No content found for this topic.</Typography>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={sortedEvents}
            itemContent={itemContent}
            style={{ height: "100%", width: "100%" }}
            followOutput={false}
          />
        )}
      </div>
      <ModeratorSelectorDialog
        open={moderatorDialogOpen}
        moderators={allModerators}
        selected={visibleModerators}
        onSubmit={(pubkeys) => {
          setVisibleModerators(pubkeys);
          if (tag) saveModeratorPrefs(tag, pubkeys);
        }}
        onClose={() => setModeratorDialogOpen(false)}
      />
    </Box>
  );
};

export default TopicExplorer;
