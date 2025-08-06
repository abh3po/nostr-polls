import { useEffect, useMemo, useState } from "react";
import { Event, Filter } from "nostr-tools";
import { verifyEvent } from "nostr-tools";
import { useUserContext } from "../../hooks/useUserContext";
import { useRelays } from "../../hooks/useRelays";
import {
  Select,
  MenuItem,
  CircularProgress,
  Container,
  Box,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { styled } from "@mui/system";
import { SubCloser } from "nostr-tools/lib/types/pool";
import { pool } from "../../singletons";
import { Virtuoso } from "react-virtuoso";
import { Feed } from "./Feed";

const KIND_POLL = 1068;
const KIND_RESPONSE = [1018, 1070];
const KIND_REPOST = 16;

const StyledSelect = styled(Select)`
  &::before,
  &::after {
    border-bottom: none !important;
  }
`;

const CenteredBox = styled(Box)`
  display: flex;
  justify-content: center;
`;

export const PollFeed = () => {
  const [pollEvents, setPollEvents] = useState<Event[]>([]);
  const [repostEvents, setRepostEvents] = useState<Event[]>([]);
  const [userResponses, setUserResponses] = useState<Event[]>([]);
  const [eventSource, setEventSource] = useState<"global" | "following">(
    "global"
  );
  const [feedSubscription, setFeedSubscription] = useState<
    SubCloser | undefined
  >();
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [missingIds, setMissingIds] = useState<string[]>([]);

  const { user } = useUserContext();
  const { relays } = useRelays();

  const mergeEvents = (existing: Event[], incoming: Event[]): Event[] => {
    const map = new Map(existing.map((e) => [e.id, e]));
    for (const e of incoming) {
      map.set(e.id, e); // Overwrite duplicates
    }
    return Array.from(map.values()).sort((a, b) => b.created_at - a.created_at);
  };

  const loadMore = () => {
    if (loadingMore || !pollEvents.length) return;
    setLoadingMore(true);

    const oldest = Math.min(...pollEvents.map((e) => e.created_at));
    const filterPoll: Filter = {
      kinds: [KIND_POLL],
      until: oldest,
      limit: 20,
    };
    const filterResposts: Filter = {
      kinds: [KIND_REPOST],
      until: oldest,
      "#k": ["1068"],
    };

    if (eventSource === "following" && user?.follows?.length) {
      filterPoll.authors = user.follows;
      filterResposts.authors = user.follows;
    }

    const closer = pool.subscribeMany(relays, [filterPoll, filterResposts], {
      onevent: (event: Event) => {
        if (verifyEvent(event)) {
          if (event.kind === KIND_REPOST) {
            console.log("GOT REPOST", event);
            setRepostEvents((prev) => mergeEvents(prev, [event]));
          } else {
            setPollEvents((prev) => mergeEvents(prev, [event]));
          }
        }
      },
      oneose: () => setLoadingMore(false),
    });

    setFeedSubscription(closer);
  };

  const fetchInitialPolls = () => {
    const filterPolls: Filter = {
      kinds: [KIND_POLL],
      since: Math.floor(Date.now() / 1000) - 60 * 60 * 24, // last 24h
      limit: 40,
    };
    const filterResposts: Filter = {
      kinds: [KIND_REPOST],
      since: Math.floor(Date.now() / 1000) - 60 * 60 * 24, // last 24h
      "#k": ["1068"],
    };

    if (eventSource === "following" && user?.follows?.length) {
      filterPolls.authors = user.follows;
      filterResposts.authors = user.follows;
    }

    const closer = pool.subscribeMany(relays, [filterPolls, filterResposts], {
      onevent: (event: Event) => {
        if (verifyEvent(event)) {
          if (event.kind === KIND_REPOST) {
            setRepostEvents((prev) => mergeEvents(prev, [event]));
          } else {
            setPollEvents((prev) => mergeEvents(prev, [event]));
          }
        }
      },
      oneose: () => setLoadingInitial(false),
    });

    return closer;
  };

  const pollForNewPolls = () => {
    const since = pollEvents[0]?.created_at || Math.floor(Date.now() / 1000);
    const filterPolls: Filter = {
      kinds: [KIND_POLL],
      since: since + 1,
    };
    const filterResposts: Filter = {
      kinds: [KIND_REPOST],
      since: since + 1,
      "#k": ["1068"],
    };

    if (eventSource === "following" && user?.follows?.length) {
      filterPolls.authors = user.follows;
      filterResposts.authors = user.follows;
    }

    return pool.subscribeMany(relays, [filterPolls, filterResposts], {
      onevent: (event: Event) => {
        if (verifyEvent(event) && !pollEvents.find((e) => e.id === event.id)) {
          if (event.kind === KIND_REPOST) {
            setRepostEvents((prev) => mergeEvents(prev, [event]));
          } else {
            setPollEvents((prev) => mergeEvents(prev, [event]));
          }
        }
      },
    });
  };

  const fetchUserResponses = () => {
    if (!user) return;

    const filter: Filter[] = [
      {
        kinds: KIND_RESPONSE,
        authors: [user.pubkey],
        limit: 40,
      },
    ];

    return pool.subscribeMany(relays, filter, {
      onevent: (event: Event) => {
        if (verifyEvent(event)) {
          setUserResponses((prev) => [...prev, event]);
        }
      },
    });
  };

  const getLatestResponsesByPoll = (events: Event[]) => {
    const map = new Map<string, Event>();
    for (const event of events) {
      const pollId = event.tags.find((t) => t[0] === "e")?.[1];
      if (!pollId) continue;
      if (!map.has(pollId) || event.created_at > map.get(pollId)!.created_at) {
        map.set(pollId, event);
      }
    }
    return map;
  };

  const latestResponses = useMemo(
    () => getLatestResponsesByPoll(userResponses),
    [userResponses]
  );
  const repostsByPollId = useMemo(() => {
    const map = new Map<string, Event[]>();
    repostEvents.forEach((repost) => {
      let originalId = repost.tags.find((t) => t[0] === "q")?.[1];
      if (!originalId) originalId = repost.tags.find((t) => t[0] === "e")?.[1];
      if (!originalId) return;
      const arr = map.get(originalId) || [];
      setMissingIds([...missingIds, originalId]);
      arr.push(repost);
      map.set(originalId, arr);
    });
    return map;
  }, [repostEvents]);

  // Combine poll events and reposts into one feed, sorted by created_at descending
  const combinedEvents = useMemo(() => {
    // For sorting, consider max repost created_at or poll created_at
    return [...pollEvents].sort((a, b) => {
      const aReposts = repostsByPollId.get(a.id) || [];
      const bReposts = repostsByPollId.get(b.id) || [];

      const aLatestRepost = aReposts.reduce(
        (max, e) => (e.created_at > max ? e.created_at : max),
        0
      );
      const bLatestRepost = bReposts.reduce(
        (max, e) => (e.created_at > max ? e.created_at : max),
        0
      );

      const aTime = Math.max(a.created_at, aLatestRepost);
      const bTime = Math.max(b.created_at, bLatestRepost);
      return bTime - aTime;
    });
  }, [pollEvents, repostsByPollId]);

  useEffect(() => {
    if (feedSubscription) feedSubscription.close();
    setPollEvents([]);
    setRepostEvents([]);
    setLoadingInitial(true);
    const closer = fetchInitialPolls();
    setFeedSubscription(closer);
    return () => closer?.close();
  }, [eventSource]);

  useEffect(() => {
    let closer: SubCloser | undefined;
    if (user && userResponses.length === 0) {
      closer = fetchUserResponses();
    }
    return () => closer?.close();
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      pollForNewPolls();
    }, 15000);
    return () => clearInterval(interval);
  }, [pollEvents, repostEvents, relays, eventSource]);

  console.log("REPOST FOR EVENT ID IS", repostsByPollId);
  console.log("COmbine events are", combinedEvents);
  return (
    <Container maxWidth="lg" disableGutters>
      <Grid container spacing={2}>
        <Grid size={12}>
          <CenteredBox>
            <StyledSelect
              variant="standard"
              onChange={(e) =>
                setEventSource(e.target.value as "global" | "following")
              }
              value={eventSource}
            >
              <MenuItem value="global">global polls</MenuItem>
              <MenuItem
                value="following"
                disabled={!user || !user.follows?.length}
              >
                polls from people you follow
              </MenuItem>
            </StyledSelect>
          </CenteredBox>
        </Grid>

        <Grid size={12}>
          <div style={{ height: "100vh" }}>
            {loadingInitial ? (
              <CenteredBox sx={{ mt: 4 }}>
                <CircularProgress />
              </CenteredBox>
            ) : (
              <Virtuoso
                data={combinedEvents}
                itemContent={(index, event) => (
                  <div key={event.id}>
                    <Feed
                      events={[event]}
                      userResponses={latestResponses}
                      reposts={repostsByPollId}
                    />
                  </div>
                )}
                endReached={loadMore}
                components={{
                  Footer: () =>
                    loadingMore ? (
                      <CenteredBox sx={{ mt: 2, mb: 2 }}>
                        <CircularProgress size={24} />
                      </CenteredBox>
                    ) : null,
                }}
              />
            )}
          </div>
        </Grid>
      </Grid>
    </Container>
  );
};
