import {
  Box,
  Chip,
  Typography,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  Checkbox,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import { Virtuoso } from "react-virtuoso";
import { useEffect, useRef, useState } from "react";
import type { VirtuosoHandle } from "react-virtuoso";
import { useListContext } from "../../../hooks/useListContext";
import { useMyTopicsFeed } from "../../../hooks/useMyTopicsFeed";
import { Notes } from "../../../components/Notes";
import OverlappingAvatars from "../../../components/Common/OverlappingAvatars";
import { useUserContext } from "../../../hooks/useUserContext";

const MyTopicsFeed = () => {
  const { myTopics } = useListContext();
  const { notes, toggleShowAnyway, publishModeration, loading } =
    useMyTopicsFeed(myTopics || new Set());
  const { user, requestLogin } = useUserContext();

  const virtuosoRef = useRef<VirtuosoHandle | null>(null);

  const [dialog, setDialog] = useState<{
    note: any;
    type: "off-topic" | "remove-user";
    topics: string[];
  } | null>(null);

  if (!user) {
    // Show login button if user not logged in
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          mt: 4,
        }}
      >
        <Button variant="contained" onClick={requestLogin}>
          Login to view your Interests feed
        </Button>
      </Box>
    );
  }

  if (loading) {
    // Show loader while fetching notes
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          py: 6,
          height: "100%",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Virtuoso
        ref={virtuosoRef}
        data={notes}
        itemContent={(_, item) => {
          const { event, topics, hidden, moderators, moderatedTopics } = item;

          return (
            <Box sx={{ mb: 2 }}>
              {/* Topic indicator */}
              <Box sx={{ mb: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                {topics.map((t) => (
                  <Chip
                    key={t}
                    label={`#${t}`}
                    size="small"
                    color={moderatedTopics.has(t) ? "warning" : "default"}
                  />
                ))}
              </Box>

              <Notes
                event={event}
                hidden={hidden}
                showReason={
                  hidden && moderators.size > 0 ? (
                    <Box>
                      <Typography variant="body2">Moderated by:</Typography>
                      <OverlappingAvatars
                        ids={Array.from(moderators)}
                        maxAvatars={4}
                      />
                    </Box>
                  ) : null
                }
                extras={
                  <>
                    <MenuItem
                      onClick={() =>
                        setDialog({
                          note: event,
                          type: "off-topic",
                          topics,
                        })
                      }
                    >
                      Mark off-topic
                    </MenuItem>

                    <MenuItem
                      onClick={() =>
                        setDialog({
                          note: event,
                          type: "remove-user",
                          topics,
                        })
                      }
                    >
                      Remove user from topic
                    </MenuItem>

                    {hidden && (
                      <MenuItem onClick={() => toggleShowAnyway(event.id)}>
                        Show anyway
                      </MenuItem>
                    )}
                  </>
                }
              />
            </Box>
          );
        }}
        style={{ height: "100vh" }}
      />

      {dialog && (
        <ModerationDialog
          open
          note={dialog.note}
          topics={dialog.topics}
          type={dialog.type}
          onClose={() => setDialog(null)}
          onSubmit={async (topics) => {
            await publishModeration(dialog.type, dialog.note, topics);
            setDialog(null);
          }}
        />
      )}
    </>
  );
};

const ModerationDialog = ({
  open,
  note,
  topics,
  type,
  onClose,
  onSubmit,
}: {
  open: boolean;
  note: Event;
  topics: string[];
  type: "off-topic" | "remove-user";
  onClose: () => void;
  onSubmit: (topics: string[]) => void;
}) => {
  const [selected, setSelected] = useState<string[]>(topics);

  useEffect(() => {
    setSelected(topics);
  }, [topics]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>
        {type === "off-topic"
          ? "Mark note off-topic"
          : "Remove user from topic"}
      </DialogTitle>

      <DialogContent>
        {topics.map((t) => (
          <Box key={t} display="flex" alignItems="center">
            <Checkbox
              checked={selected.includes(t)}
              onChange={() =>
                setSelected((prev) =>
                  prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                )
              }
            />
            <Typography>#{t}</Typography>
          </Box>
        ))}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          disabled={selected.length === 0}
          onClick={() => onSubmit(selected)}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MyTopicsFeed;
