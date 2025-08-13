import React, { useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { usePolls } from "./PollProvider";
import { FeedItem } from "./FeedItem";
import { CircularProgress, Box, Select, MenuItem } from "@mui/material";
import { styled } from "@mui/system";

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

export const Feed = () => {
  const {
    pollEvents,
    repostEvents,
    userResponses,
    eventSource,
    setEventSource,
    loadMore,
  } = usePolls();

  const repostsByPollId = useMemo(() => {
    const map = new Map<string, typeof repostEvents>();
    repostEvents.forEach((repost) => {
      let originalId =
        repost.tags.find((t) => t[0] === "q")?.[1] ||
        repost.tags.find((t) => t[0] === "e")?.[1];
      if (!originalId) return;
      const arr = map.get(originalId) || [];
      arr.push(repost);
      map.set(originalId, arr);
    });
    return map;
  }, [repostEvents]);

  const combinedEvents = useMemo(() => {
    return [...pollEvents].sort((a, b) => {
      const aReposts = repostsByPollId.get(a.id) || [];
      const bReposts = repostsByPollId.get(b.id) || [];
      const aLatest = Math.max(
        a.created_at,
        ...aReposts.map((e) => e.created_at)
      );
      const bLatest = Math.max(
        b.created_at,
        ...bReposts.map((e) => e.created_at)
      );
      return bLatest - aLatest;
    });
  }, [pollEvents, repostsByPollId]);

  return (
    <div style={{ height: "100vh" }}>
      <CenteredBox>
        <StyledSelect
          variant="standard"
          onChange={(e) =>
            setEventSource(e.target.value as "global" | "following")
          }
          value={eventSource}
        >
          <MenuItem value="global">global polls</MenuItem>
          <MenuItem value="following">polls from people you follow</MenuItem>
        </StyledSelect>
      </CenteredBox>
      {combinedEvents.length === 0 ? (
        <CenteredBox sx={{ mt: 4 }}>
          <CircularProgress />
        </CenteredBox>
      ) : (
        <Virtuoso
          data={combinedEvents}
          itemContent={(index, event) => (
            <FeedItem
              key={event.id}
              event={event}
              repostedBy={
                repostsByPollId.get(event.id)?.map((e) => e.pubkey) || []
              }
              userResponse={userResponses.find(
                (r) => r.tags.find((t) => t[0] === "e")?.[1] === event.id
              )}
            />
          )}
          endReached={loadMore}
        />
      )}
    </div>
  );
};
