import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
import type { VirtuosoHandle } from "react-virtuoso";
import useImmersiveScroll from "../../hooks/useImmersiveScroll";
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

// new: chunking helpers
const CHUNK_SIZE = 1000;
function chunkArray<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

export const PollFeed = () => {
  const [pollEvents, setPollEvents] = useState<Event[]>([]);
  const [repostEvents, setRepostEvents] = useState<Event[]>([]);
  const [userResponses, setUserResponses] = useState<Event[]>([]);
  // Add "webOfTrust" to eventSource type
  const [eventSource, setEventSource] = useState<
    "global" | "following" | "webOfTrust"
  >("global");
  const [feedSubscription, setFeedSubscription] = useState<
    SubCloser | undefined
  >();
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [missingIds, setMissingIds] = useState<string[]>([]);

  const { user } = useUserContext();
  const { relays } = useRelays();
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // enable immersive behavior (smooth)
  useImmersiveScroll(containerRef, virtuosoRef, { smooth: true });

  const mergeEvents = (existing: Event[], incoming: Event[]): Event[] => {
    const map = new Map(existing.map((e) => [e.id, e]));
    for (const e of incoming) {
      map.set(e.id, e); // Overwrite duplicates
    }
    return Array.from(map.values()).sort((a, b) => b.created_at - a.created_at);
  };

  const handleIncomingEvent = useCallback(
    (event: Event) => {
      if (!verifyEvent(event)) return;
      if (event.kind === KIND_REPOST) {
        setRepostEvents((prev) => mergeEvents(prev, [event]));
      } else {
        setPollEvents((prev) => mergeEvents(prev, [event]));
      }
    },
    [setPollEvents, setRepostEvents]
  );

  // helper to subscribe with possibly chunked author lists and return a single closer
  const subscribeWithAuthors = useCallback(
    (filters: Filter[], onAllChunksComplete?: () => void) => {
      // if filters already have authors (small lists) just subscribe directly
      const authors = filters[0]?.authors as string[] | undefined;
      if (!authors || authors.length <= CHUNK_SIZE) {
        return pool.subscribeMany(relays, filters, {
          onevent: handleIncomingEvent,
          oneose: () => {
            onAllChunksComplete?.();
          },
        });
      }

      // large author list -> chunk
      const closers: SubCloser[] = [];
      const chunks = chunkArray(authors, CHUNK_SIZE);
      let completed = 0;

      for (const chunk of chunks) {
        const chunkedFilters = filters.map((f) => ({ ...f, authors: chunk }));
        const closer = pool.subscribeMany(relays, chunkedFilters, {
          onevent: handleIncomingEvent,
          oneose: () => {
            completed++;
            if (completed === chunks.length) {
              onAllChunksComplete?.();
              closers.forEach((c) => c.close());
            }
          },
        });
        closers.push(closer);
      }

      return {
        close: () => closers.forEach((c) => c.close()),
      } as SubCloser;
    },
    [relays, handleIncomingEvent]
  );

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
    if (
      eventSource === "webOfTrust" &&
      user?.webOfTrust &&
      user.webOfTrust.size
    ) {
      const authors = Array.from(user.webOfTrust);
      filterPoll.authors = authors;
      filterResposts.authors = authors;
    }

    const closer = subscribeWithAuthors([filterPoll, filterResposts], () => {
      setLoadingMore(false);
    });
    setFeedSubscription(closer);
  };

  const fetchInitialPolls = () => {
    const filterPolls: Filter = {
      kinds: [KIND_POLL],
      limit: 40,
    };
    const filterResposts: Filter = {
      kinds: [KIND_REPOST],
      "#k": ["1068"],
    };

    if (eventSource === "following" && user?.follows?.length) {
      filterPolls.authors = user.follows;
      filterResposts.authors = user.follows;
    }
    if (
      eventSource === "webOfTrust" &&
      user?.webOfTrust &&
      user.webOfTrust.size
    ) {
      const authors = Array.from(user.webOfTrust);
      filterPolls.authors = authors;
      filterResposts.authors = authors;
    }

    const closer = subscribeWithAuthors([filterPolls, filterResposts], () => {
      setLoadingInitial(false);
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
    if (
      eventSource === "webOfTrust" &&
      user?.webOfTrust &&
      user.webOfTrust.size
    ) {
      const authors = Array.from(user.webOfTrust);
      filterPolls.authors = authors;
      filterResposts.authors = authors;
    }

    return subscribeWithAuthors([filterPolls, filterResposts]);
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
  return (
    <Container maxWidth="lg" disableGutters>
      <Grid container spacing={2}>
        <Grid size={12}>
          <CenteredBox>
            <StyledSelect
              variant="standard"
              onChange={(e) =>
                setEventSource(
                  e.target.value as "global" | "following" | "webOfTrust"
                )
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
              <MenuItem
                value="webOfTrust"
                disabled={!user || !user.webOfTrust || !user.webOfTrust.size}
              >
                polls from your web of trust
              </MenuItem>
            </StyledSelect>
          </CenteredBox>
        </Grid>

        <Grid size={12}>
          <div ref={containerRef} style={{ height: "100vh" }}>
            {loadingInitial ? (
              <CenteredBox sx={{ mt: 4 }}>
                <CircularProgress />
              </CenteredBox>
            ) : (
              <Virtuoso
                ref={virtuosoRef}
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
