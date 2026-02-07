import { useEffect, useMemo, useState, useCallback } from "react";
import { Event, Filter } from "nostr-tools";
import { verifyEvent } from "nostr-tools";
import { useUserContext } from "../../hooks/useUserContext";
import { useRelays } from "../../hooks/useRelays";
import {
  Select,
  MenuItem,
  Container,
  Box,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { styled } from "@mui/system";
import { nostrRuntime } from "../../singletons";
import { SubscriptionHandle } from "../../nostrRuntime/types";
import { Feed } from "./Feed";
import UnifiedFeed from "./UnifiedFeed";

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

// Note: Chunking is now handled automatically by nostrRuntime

export const PollFeed = () => {
  const [pollEvents, setPollEvents] = useState<Event[]>([]);
  const [repostEvents, setRepostEvents] = useState<Event[]>([]);
  const [userResponses, setUserResponses] = useState<Event[]>([]);
  // Add "webOfTrust" to eventSource type
  const [eventSource, setEventSource] = useState<
    "global" | "following" | "webOfTrust"
  >("global");
  const [feedSubscription, setFeedSubscription] = useState<
    SubscriptionHandle | undefined
  >();
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const { user } = useUserContext();
  const { relays } = useRelays();

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

  // Helper to subscribe - runtime handles chunking automatically for large author lists
  const subscribeWithAuthors = useCallback(
    (filters: Filter[], onAllChunksComplete?: () => void) => {
      const handle = nostrRuntime.subscribe(relays, filters, {
        onEvent: handleIncomingEvent,
        onEose: () => {
          onAllChunksComplete?.();
        },
      });

      // Return a wrapper that matches the old API
      return {
        ...handle,
        close: () => handle.unsubscribe(),
      };
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

    const handle = nostrRuntime.subscribe(relays, filter, {
      onEvent: (event: Event) => {
        if (verifyEvent(event)) {
          setUserResponses((prev) => [...prev, event]);
        }
      },
    });

    return {
      ...handle,
      close: () => handle.unsubscribe(),
    };
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
    if (feedSubscription) feedSubscription.unsubscribe();
    setPollEvents([]);
    setRepostEvents([]);
    setLoadingInitial(true);
    const closer = fetchInitialPolls();
    setFeedSubscription(closer);
    return () => closer?.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSource]);

  useEffect(() => {
    let closer: SubscriptionHandle | undefined;
    if (user && userResponses.length === 0) {
      closer = fetchUserResponses();
    }
    return () => closer?.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      pollForNewPolls();
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <UnifiedFeed
            data={combinedEvents}
            loading={loadingInitial}
            loadingMore={loadingMore}
            onEndReached={loadMore}
            itemContent={(index, event) => (
              <div key={event.id}>
                <Feed
                  events={[event]}
                  userResponses={latestResponses}
                  reposts={repostsByPollId}
                />
              </div>
            )}
          />
        </Grid>
      </Grid>
    </Container>
  );
};
