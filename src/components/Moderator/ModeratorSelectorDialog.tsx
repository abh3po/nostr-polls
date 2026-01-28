// File: components/Moderation/ModeratorSelectorDialog.tsx

import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { useAppContext } from "../../hooks/useAppContext";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";

interface Props {
  open: boolean;
  moderators: string[];
  selected: string[];
  onSubmit: (pubkeys: string[]) => void;
  onClose: () => void;
}

const ModeratorSelectorDialog: React.FC<Props> = ({
  open,
  moderators,
  selected,
  onSubmit,
  onClose,
}) => {
  const [temp, setTemp] = useState<string[]>(selected);
  let { profiles, fetchUserProfileThrottled } = useAppContext();

  useEffect(() => {
    setTemp(selected);
    moderators.forEach((m) => {
      if (!profiles?.get(m)) fetchUserProfileThrottled(m);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, moderators]);

  const toggle = (pubkey: string) => {
    setTemp((prev) =>
      prev.includes(pubkey)
        ? prev.filter((p) => p !== pubkey)
        : [...prev, pubkey]
    );
  };

  const handleSubmit = () => {
    onSubmit(temp);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Select Moderators</DialogTitle>
      <DialogContent dividers>
        <List dense>
          {moderators.map((pubkey) => (
            <ListItem key={pubkey} onClick={() => toggle(pubkey)}>
              <ListItemAvatar>
                <Avatar
                  src={profiles?.get(pubkey)?.picture || DEFAULT_IMAGE_URL}
                />
              </ListItemAvatar>
              <ListItemText
                primary={profiles?.get(pubkey)?.name || "Anon User"}
              />
              <Checkbox checked={temp.includes(pubkey)} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModeratorSelectorDialog;
