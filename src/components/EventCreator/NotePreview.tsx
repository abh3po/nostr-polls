import React from 'react';
import { Event } from 'nostr-tools';
import {
  Card,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import { Notes } from '../Notes';
import { useUserContext } from '../../hooks/useUserContext';
import { NOSTR_EVENT_KINDS } from "../../constants/nostr";

interface NotePreviewProps {
  noteEvent: Partial<Event>;
}

export const NotePreview: React.FC<NotePreviewProps> = ({ noteEvent }) => {
  const { user } = useUserContext();
  const previewPubkey = user?.pubkey || 'preview-pubkey';

  return (
    <Card variant="outlined" sx={{ mt: 2, mb: 2, minHeight: 200 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Note Preview
        </Typography>
        {!noteEvent.content?.trim() ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={100}
            sx={{ opacity: 0.6 }}
          >
            <Typography variant="body2" color="textSecondary">
              Start typing to see a preview of your note
            </Typography>
          </Box>
        ) : (
          <Box sx={{ opacity: 0.8, pointerEvents: 'none' }}>
            <Notes event={{
              id: 'preview-note-id',
              pubkey: previewPubkey,
              created_at: Math.floor(Date.now() / 1000),
              kind: NOSTR_EVENT_KINDS.TEXT_NOTE,
              tags: [],
              content: noteEvent.content || '',
              sig: 'preview-note-id',
            }} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
