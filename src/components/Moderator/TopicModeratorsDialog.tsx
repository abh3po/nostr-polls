import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Checkbox,
  Typography,
  Box,
  Chip,
  Divider,
} from "@mui/material";
import { useAppContext } from "../../hooks/useAppContext";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";

interface TopicModeratorsDialogProps {
  open: boolean;
  onClose: () => void;
  moderatorsByTopic: Map<string, string[]>;
  selectedModsByTopic: Map<string, string[]>;
  onApply: (topic: string, selected: string[]) => void;
}

const TopicModeratorsDialog: React.FC<TopicModeratorsDialogProps> = ({
  open,
  onClose,
  moderatorsByTopic,
  selectedModsByTopic,
  onApply,
}) => {
  const { profiles, fetchUserProfileThrottled } = useAppContext();
  const [tempSelections, setTempSelections] = useState<Map<string, string[]>>(
    new Map()
  );

  useEffect(() => {
    if (!open) return;
    // Initialize temp state from current selections
    const init = new Map<string, string[]>();
    moderatorsByTopic.forEach((mods, topic) => {
      init.set(topic, selectedModsByTopic.get(topic) ?? [...mods]);
    });
    setTempSelections(init);

    // Fetch profiles for all moderators
    moderatorsByTopic.forEach((mods) => {
      mods.forEach((pubkey) => {
        if (!profiles.has(pubkey)) {
          fetchUserProfileThrottled(pubkey);
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, moderatorsByTopic, selectedModsByTopic]);

  const toggle = (topic: string, pubkey: string) => {
    setTempSelections((prev) => {
      const next = new Map(prev);
      const current = next.get(topic) ?? [];
      if (current.includes(pubkey)) {
        next.set(
          topic,
          current.filter((p) => p !== pubkey)
        );
      } else {
        next.set(topic, [...current, pubkey]);
      }
      return next;
    });
  };

  const handleApply = () => {
    tempSelections.forEach((selected, topic) => {
      onApply(topic, selected);
    });
    onClose();
  };

  const topics = Array.from(moderatorsByTopic.keys()).sort();

  if (topics.length === 0) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth>
        <DialogTitle>Topic Moderators</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ py: 2 }}>
            No moderators found yet for your topics.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Topic Moderators</DialogTitle>
      <DialogContent dividers>
        {topics.map((topic, topicIndex) => {
          const mods = moderatorsByTopic.get(topic) ?? [];
          const selected = tempSelections.get(topic) ?? [];

          return (
            <Box key={topic}>
              {topicIndex > 0 && <Divider sx={{ my: 1 }} />}
              <Box sx={{ display: "flex", alignItems: "center", mt: 1, mb: 0.5 }}>
                <Chip label={`#${topic}`} size="small" color="primary" variant="outlined" />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {selected.length}/{mods.length} active
                </Typography>
              </Box>
              <List dense disablePadding>
                {mods.map((pubkey) => {
                  const profile = profiles.get(pubkey);
                  return (
                    <ListItem
                      key={pubkey}
                      dense
                      onClick={() => toggle(topic, pubkey)}
                      sx={{ cursor: "pointer", pl: 1 }}
                    >
                      <ListItemAvatar sx={{ minWidth: 40 }}>
                        <Avatar
                          src={profile?.picture || DEFAULT_IMAGE_URL}
                          sx={{ width: 28, height: 28 }}
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          profile?.display_name || profile?.name || "Unknown"
                        }
                        primaryTypographyProps={{ variant: "body2" }}
                      />
                      <Checkbox
                        edge="end"
                        checked={selected.includes(pubkey)}
                        size="small"
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TopicModeratorsDialog;
