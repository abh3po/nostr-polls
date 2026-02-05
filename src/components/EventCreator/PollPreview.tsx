import React from 'react';
import { Event } from 'nostr-tools';
import {
  Card,
  CardContent,
  Typography,
  Box
} from '@mui/material';
import PollResponseForm from '../PollResponse/PollResponseForm';
import { useUserContext } from '../../hooks/useUserContext';
import { NOSTR_EVENT_KINDS } from "../../constants/nostr";

// Valid 64-character hex strings for preview purposes
const MOCK_PUBKEY = '0000000000000000000000000000000000000000000000000000000000000001';
const MOCK_EVENT_ID = '0000000000000000000000000000000000000000000000000000000000000000';

interface PollPreviewProps {
  pollEvent: Partial<Event>;
}

export const PollPreview: React.FC<PollPreviewProps> = ({ pollEvent }) => {
  const { user } = useUserContext();
  const previewPubkey = user?.pubkey || MOCK_PUBKEY;

  return (
    <Card variant="outlined" sx={{ mt: 2, mb: 2, minHeight: 200 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Poll Preview
        </Typography>
        {!pollEvent.content?.trim() ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={100}
            sx={{ opacity: 0.6 }}
          >
            <Typography variant="body2" color="textSecondary">
              Enter a poll question to see the preview
            </Typography>
          </Box>
        ) : (
          <Box sx={{ opacity: 0.8, pointerEvents: 'none' }}>
            <PollResponseForm
              pollEvent={{
                id: MOCK_EVENT_ID,
                pubkey: previewPubkey,
                created_at: Math.floor(Date.now() / 1000),
                kind: NOSTR_EVENT_KINDS.POLL,
                tags: [...(pollEvent.tags || [])],
                content: pollEvent.content || '',
                sig: MOCK_EVENT_ID,
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
