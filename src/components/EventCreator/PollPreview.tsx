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

interface PollPreviewProps {
  pollEvent: Partial<Event>;
}

export const PollPreview: React.FC<PollPreviewProps> = ({ pollEvent }) => {
  const { user } = useUserContext();
  const previewPubkey = user?.pubkey || 'preview-pubkey';

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
                id: 'preview-poll-id',
                pubkey: previewPubkey,
                created_at: Math.floor(Date.now() / 1000),
                kind: NOSTR_EVENT_KINDS.POLL,
                tags: [...(pollEvent.tags || [])],
                content: pollEvent.content || '',
                sig: 'preview-poll-id',
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
