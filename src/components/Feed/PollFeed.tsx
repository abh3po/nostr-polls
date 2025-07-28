import { useEffect, useState } from "react";
import { Event, Filter } from "nostr-tools";
import { useAppContext } from "../../hooks/useAppContext";
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
  const [pollEvents, setPollEvents] = useState<Event[] | undefined>([]);
  const [userResponses, setUserResponses] = useState<Event[] | undefined>([]);
  const [eventSource, setEventSource] = useState<"global" | "following">("global");
  const [feedSubscription, setFeedSubscription] = useState<SubCloser | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  const { user } = useUserContext();
  const { relays } = useRelays();

  const KIND_FILTER = "Polls";

  const loadMore = () => {
    if (loadingMore || !pollEvents?.length) return;
    setLoadingMore(true);

    const sorted = [...pollEvents].sort((a, b) => a.created_at - b.created_at);
    const lastPollEvent = sorted[0];

    const filter: Filter = {
      kinds: [1068],
      until: lastPollEvent?.created_at || Math.floor(Date.now() / 1000),
    };

    if (eventSource === "following" && user?.follows?.length) {
      filter.authors = user.follows;
    }

    if (feedSubscription) feedSubscription.close();
    const newCloser = pool.subscribeMany(relays, [filter], {
      onevent: (event: Event) => {
        handleFeedEvents(event, newCloser);
        setLoadingMore(false);
      },
    });

    setFeedSubscription(newCloser);
  };

  const handleFeedEvents = (event: Event, closer: SubCloser) => {
    if (
      verifyEvent(event) &&
      !pollEvents?.some((e) => e.id === event.id)
    ) {
      setPollEvents((prev) => [...(prev || []), event]);
    }
    if ((pollEvents?.length || 0) >= 100) closer.close();
  };

  const getUniqueLatestEvents = (events: Event[]) => {
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

  const handleResponseEvents = (event: Event) => {
    setUserResponses((prev) => [...(prev || []), event]);
  };

  const fetchFeedEvents = () => {
    const filter: Filter = {
      kinds: [1068],
      limit: 20,
    };

    if (eventSource === "following" && user?.follows?.length) {
      filter.authors = user.follows;
    }

    const newCloser = pool.subscribeMany(relays, [filter], {
      onevent: (event: Event) => {
        handleFeedEvents(event, newCloser);
      },
    });

    return newCloser;
  };

  const fetchResponseEvents = () => {
    const filters: Filter[] = [
      {
        kinds: [1018, 1070],
        authors: [user!.pubkey],
        limit: 40,
      },
    ];

    const closer = pool.subscribeMany(relays, filters, {
      onevent: handleResponseEvents,
    });

    return closer;
  };

  useEffect(() => {
    if (feedSubscription) feedSubscription.close();
    setPollEvents([]);
    const newCloser = fetchFeedEvents();
    setFeedSubscription(newCloser);
    return () => newCloser?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSource]);

  useEffect(() => {
    let closer: SubCloser | undefined;
    if (user && !userResponses?.length) {
      closer = fetchResponseEvents();
    }
    return () => closer?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
          <div style={{ height: "80vh" }}>
            <Virtuoso
              data={pollEvents || []}
              itemContent={(index, event) => (
                <Feed
                  events={[event]}
                  userResponses={getUniqueLatestEvents(userResponses || [])}
                />
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
          </div>
        </Grid>
      </Grid>
    </Container>
  );
};
