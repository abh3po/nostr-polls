import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Stack,
} from "@mui/material";
import { nip19, Event } from "nostr-tools";
import { useAppContext } from "../../hooks/useAppContext";

interface Props {
  event: Event;
}

const ReviewCard: React.FC<Props> = ({ event }) => {
  const rating =
    parseFloat(event.tags.find((t) => t[0] === "rating")?.[1] || "0") * 5;
  const content = event.content;
  const pubkey = event.pubkey;

  const { profiles, fetchUserProfileThrottled } = useAppContext();
  const reviewUser = profiles?.get(pubkey);
  if(!reviewUser) fetchUserProfileThrottled(pubkey)

  const displayName = reviewUser?.name || nip19.npubEncode(pubkey);
  const picture = reviewUser?.picture;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center" mb={1}>
          <Avatar
            src={picture}
            alt={displayName}
            sx={{ width: 40, height: 40 }}
          />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {rating.toFixed(1)} ★
            </Typography>
          </Box>
        </Stack>

        {content && (
          <Typography variant="body1" mt={1}>
            {content}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewCard;
