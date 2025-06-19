import { useEffect, useState } from "react";
import { defaultRelays } from "../../nostr";
import { Event, Filter } from "nostr-tools";
import { Feed } from "./Feed";
import { useAppContext } from "../../hooks/useAppContext";
import { verifyEvent } from "nostr-tools";
import { useUserContext } from "../../hooks/useUserContext";
import { Select, MenuItem, Button, CircularProgress, Container, Box } from "@mui/material";
import Grid from '@mui/material/Grid2';
import { styled } from "@mui/system";
import { SubCloser } from "nostr-tools/lib/types/pool";

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

const FULL_WIDTH_GRID = { xs: 12 };
const GRID_SPACING = { xs: 2, sm: 3, md: 4 };
const CONTAINER_SPACING = {
  mt: { xs: 1, sm: 2, md: 3 },
  px: { xs: 1, sm: 2, md: 3 }
};
const BUTTON_SPACING = { mt: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 } };
const SELECT_SIZING = {
  maxWidth: { xs: 300, sm: 400, md: 600 },
  width: "auto"
};

export const PollFeed = () => {
  const [pollEvents, setPollEvents] = useState<Event[] | undefined>();
  const [userResponses, setUserResponses] = useState<Event[] | undefined>();
  let KIND_FILTER = "Polls";
  let [eventSource, setEventSource] = useState<"global" | "following">(
    "global"
  );
  const [feedSubscritpion, setFeedSubscription] = useState<
    SubCloser | undefined
  >();
  const { poolRef } = useAppContext();
  const { user } = useUserContext();
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    if (!pollEvents) {
      setLoadingMore(false);
      return;
    }
    let eventIdsMap: Map<string, Event> = new Map();
    pollEvents.forEach((event) => {
      eventIdsMap.set(event.id, event);
    });
    let sortedEventIds = Array.from(eventIdsMap.keys()).sort((a, b) => {
      return eventIdsMap!.get(b)!.created_at - eventIdsMap!.get(a)!.created_at;
    });
    console.log("sorted event ids are", sortedEventIds);
    let lastPollEvent = eventIdsMap.get(
      sortedEventIds[sortedEventIds.length - 1]
    );
    let filter: Filter = {
      kinds: [1068],
      until: lastPollEvent?.created_at || Date.now() / 1000,
    };
    if (feedSubscritpion) feedSubscritpion.close();
    let newCloser = poolRef.current.subscribeMany(defaultRelays, [filter], {
      onevent: (event) => {
        handleFeedEvents(event, newCloser);
        setLoadingMore(false);
      },
    });
    setFeedSubscription(newCloser);
  };

  const handleFeedEvents = (event: Event, closer: SubCloser) => {
    if (
      verifyEvent(event) &&
      !pollEvents?.map((event) => event.id).includes(event.id)
    ) {
      setPollEvents((prevEvents) => [...(prevEvents || []), event]);
    }
    if (pollEvents?.length || 0 >= 100) closer.close();
  };

  const getUniqueLatestEvents = (events: Event[]) => {
    const eventMap = new Map<string, Event>();

    events.forEach((event) => {
      let pollId = event.tags.find((t) => t[0] === "e")?.[1];
      if (!pollId) return;
      if (
        !eventMap.has(pollId) ||
        event.created_at > eventMap.get(pollId)!.created_at
      ) {
        eventMap.set(pollId, event);
      }
    });
    return eventMap;
  };

  const handleResponseEvents = (event: Event) => {
    setUserResponses((prevResponses: Event[] | undefined) => [
      ...(prevResponses || []),
      event,
    ]);
  };

  const fetchFeedEvents = () => {
    const relays = defaultRelays;
    const filter: Filter = {
      kinds: KIND_FILTER === "All" ? [1, 1068] : [1068],
      limit: 10,
    };

    if (eventSource === "following" && user?.follows?.length) {
      filter.authors = user?.follows;
    }

    let newCloser = poolRef.current.subscribeMany(relays, [filter], {
      onevent: (event) => {
        handleFeedEvents(event, newCloser);
      },
    });
    return newCloser;
  };

  const fetchResponseEvents = () => {
    const relays = defaultRelays;
    const filters: Filter[] = [
      {
        kinds: [1018, 1070],
        authors: [user!.pubkey],
        limit: 40,
      },
    ];
    let closer = poolRef.current.subscribeMany(relays, filters, {
      onevent: handleResponseEvents,
    });
    return closer;
  };

  useEffect(() => {
    if (feedSubscritpion) feedSubscritpion.close();
    if (pollEvents?.length) setPollEvents([]);
    let newCloser: SubCloser | undefined = undefined;
    newCloser = fetchFeedEvents();
    setFeedSubscription(newCloser);
    return () => {
      if (newCloser) newCloser.close();
      if (feedSubscritpion) feedSubscritpion.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolRef, eventSource]);

  useEffect(() => {
    let closer: SubCloser | undefined;
    if (user && !userResponses && poolRef && !closer) {
      closer = fetchResponseEvents();
    }
    return () => {
      if (closer) {
        closer.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, poolRef]);

  return (
    <Container maxWidth="lg" sx={CONTAINER_SPACING}>
      <Grid container spacing={GRID_SPACING}>
        <Grid size={FULL_WIDTH_GRID}>
          <CenteredBox>
            <StyledSelect
              variant={"standard"}
              onChange={(e) =>
                setEventSource(e.target.value as "global" | "following")
              }
              sx={SELECT_SIZING}
              value={eventSource}
            >
              <MenuItem value="global">global polls</MenuItem>
              <MenuItem
                value="following"
                disabled={!user || !user.follows || user.follows.length === 0}
              >
                polls from people you follow
              </MenuItem>
            </StyledSelect>
          </CenteredBox>
        </Grid>

        <Grid size={FULL_WIDTH_GRID}>
          <Feed
            events={pollEvents || []}
            userResponses={getUniqueLatestEvents(userResponses || [])}
          />
        </Grid>

        <Grid size={FULL_WIDTH_GRID}>
          <CenteredBox sx={BUTTON_SPACING}>
            <Button
              onClick={loadMore}
              variant="contained"
              disabled={loadingMore}
            >
              {loadingMore ? <CircularProgress size={24} /> : "Load More"}
            </Button>
          </CenteredBox>
        </Grid>
      </Grid>
    </Container>
  );
};
