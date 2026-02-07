import React, { useEffect, useState, useCallback } from "react";
import { Event, Filter } from "nostr-tools";
import { Box, Typography } from "@mui/material";
import { nostrRuntime } from "../../singletons";
import { useRelays } from "../../hooks/useRelays";
import PollResponseForm from "../PollResponse/PollResponseForm";
import UnifiedFeed from "../Feed/UnifiedFeed";

interface UserPollsFeedProps {
  pubkey: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

const KIND_POLL = 1068;

const UserPollsFeed: React.FC<UserPollsFeedProps> = ({ pubkey, scrollContainerRef }) => {
  const [polls, setPolls] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { relays } = useRelays();

  const fetchPolls = useCallback(() => {
    if (!pubkey) return;

    setLoading(true);
    const filters: Filter[] = [
      {
        kinds: [KIND_POLL],
        authors: [pubkey],
        limit: 50,
      },
    ];

    const handle = nostrRuntime.subscribe(relays, filters, {
      onEvent(event) {
        setPolls((prev) => {
          const exists = prev.find((e) => e.id === event.id);
          if (exists) return prev;
          return [...prev, event].sort((a, b) => b.created_at - a.created_at);
        });
      },
      onEose() {
        setLoading(false);
      },
    });

    return () => handle.unsubscribe();
  }, [pubkey, relays]);

  useEffect(() => {
    const cleanup = fetchPolls();
    return cleanup;
  }, [fetchPolls]);

  return (
    <UnifiedFeed
      data={polls}
      loading={loading}
      customScrollParent={scrollContainerRef?.current ?? undefined}
      emptyState={
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary">
            No polls yet
          </Typography>
        </Box>
      }
      itemContent={(index, poll) => (
        <Box key={poll.id} sx={{ mb: 2 }}>
          <PollResponseForm pollEvent={poll} />
        </Box>
      )}
    />
  );
};

export default UserPollsFeed;
