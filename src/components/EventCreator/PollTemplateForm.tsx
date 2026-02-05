import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Chip,
} from "@mui/material";
import MentionTextArea, { extractMentionTags } from "./MentionTextArea";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Grid from "@mui/material/Grid2";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import OptionsCard from "./OptionsCard";
import { Option } from "../../interfaces";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useNotification } from "../../contexts/notification-context";
import { useUserContext } from "../../hooks/useUserContext";
import { useNavigate } from "react-router-dom";
import { NOTIFICATION_MESSAGES } from "../../constants/notifications";
import { NOSTR_EVENT_KINDS } from "../../constants/nostr";
import { signEvent } from "../../nostr";
import { useRelays } from "../../hooks/useRelays";
import { PollPreview } from "./PollPreview";
import { Event } from "nostr-tools";
import { pool } from "../../singletons";

const generateOptionId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

const pollOptions = [
  {
    value: "singlechoice",
    icon: <RadioButtonCheckedIcon fontSize="small" />,
    label: "Single Choice Poll",
  },
  {
    value: "multiplechoice",
    icon: <CheckBoxIcon fontSize="small" />,
    label: "Multiple Choice Poll",
  },
  {
    value: "rankedchoice",
    icon: <FormatListNumberedIcon fontSize="small" />,
    label: "Ranked Choice Poll",
    disabled: true,
  },
];

const PollTemplateForm: React.FC<{
  eventContent: string;
  setEventContent: (val: string) => void;
}> = ({ eventContent, setEventContent }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [options, setOptions] = useState<Option[]>([
    [generateOptionId(), ""],
    [generateOptionId(), ""],
  ]);
  const [pollType, setPollType] = useState<string>(
    pollOptions[0]?.value || "singlechoice"
  );
  const [poW, setPoW] = useState<number | null>(null);
  const [expiration, setExpiration] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);

  const { showNotification } = useNotification();
  const { user } = useUserContext();
  const { relays } = useRelays();
  const navigate = useNavigate();
  const now = dayjs();

  const addOption = () => {
    setOptions([...options, [generateOptionId(), ""]]);
  };

  const onEditOptions = (newOptions: Option[]) => {
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    const updatedOptions = [...options];
    updatedOptions.splice(index, 1);
    setOptions(updatedOptions);
  };

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.matchAll(hashtagRegex);
    return Array.from(new Set(matches.map((m) => m[1].toLowerCase())));
  };

  useEffect(() => {
    setTopics(extractHashtags(eventContent));
  }, [eventContent]);

  const publishPollEvent = async (secret?: string) => {
    try {
      if (!eventContent.trim()) {
        showNotification(NOTIFICATION_MESSAGES.EMPTY_POLL_QUESTION, "error");
        return;
      }
      if (options.length < 1) {
        showNotification(NOTIFICATION_MESSAGES.MIN_POLL_OPTIONS, "error");
        return;
      }
      if (options.some((option) => option[1].trim() === "")) {
        showNotification(NOTIFICATION_MESSAGES.EMPTY_POLL_OPTIONS, "error");
        return;
      }

      const mentionTags = extractMentionTags(eventContent);
      const pollEvent = {
        kind: NOSTR_EVENT_KINDS.POLL,
        content: eventContent,
        tags: [
          ...options.map((option: Option) => ["option", option[0], option[1]]),
          ...relays.map((relay) => ["relay", relay]),
          ...topics.map((tag) => ["t", tag]),
          ...mentionTags,
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      if (poW) pollEvent.tags.push(["PoW", poW.toString()]);
      if (pollType) pollEvent.tags.push(["polltype", pollType]);
      if (expiration) pollEvent.tags.push(["endsAt", expiration.toString()]);

      setIsSubmitting(true);
      const signedEvent = await signEvent(pollEvent, user?.privateKey);
      setIsSubmitting(false);

      if (!signedEvent) {
        showNotification(NOTIFICATION_MESSAGES.POLL_SIGN_FAILED, "error");
        return;
      }

      pool.publish(relays, signedEvent);
      showNotification(NOTIFICATION_MESSAGES.POLL_PUBLISHED_SUCCESS, "success");
      navigate("/feeds/polls");
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error publishing poll:", error);
      showNotification(NOTIFICATION_MESSAGES.POLL_PUBLISH_FAILED, "error");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    publishPollEvent(user?.privateKey);
  };

  const handleChange = (event: any) => {
    setPollType(event.target.value);
  };

  const previewEvent: Partial<Event> = {
    content: eventContent,
    tags: [
      ...options.map((option: Option) => ["option", option[0], option[1]]),
      ["polltype", pollType],
      ...(expiration ? [["endsAt", expiration.toString()]] : []),
      ...(poW ? [["PoW", poW.toString()]] : []),
      ...topics.map((tag) => ["t", tag]),
    ],
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={4}>
        <Box>
          <MentionTextArea
            label="Poll Question"
            value={eventContent}
            onChange={setEventContent}
            required
            placeholder="Ask a question. Use @mentions and #hashtags."
          />
        </Box>

        {topics.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Topics
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {topics.map((topic, index) => (
                <Chip
                  key={index}
                  label={`#${topic}`}
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}

        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Poll Options
          </Typography>
          <OptionsCard
            onAddOption={addOption}
            onRemoveOption={removeOption}
            onEditOptions={onEditOptions}
            options={options}
          />
        </Box>

        <Box>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Poll Settings
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel id="poll-type-label">Poll Type</InputLabel>
                <Select
                  labelId="poll-type-label"
                  id="poll-type-select"
                  value={pollType}
                  label="Poll Type"
                  onChange={handleChange}
                >
                  {pollOptions.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {option.icon}
                        <Typography>{option.label}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="Poll Expiration (Optional)"
                  disablePast
                  value={expiration ? dayjs.unix(expiration) : null}
                  onChange={(value: dayjs.Dayjs | null) => {
                    if (!value) return;
                    if (value?.isBefore(now)) {
                      showNotification(
                        NOTIFICATION_MESSAGES.PAST_DATE_ERROR,
                        "error"
                      );
                      setExpiration(null);
                      return;
                    } else if (value.isValid()) {
                      setExpiration(value.unix());
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </Box>

        <Box>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Advanced Settings
          </Typography>
          <TextField
            type="number"
            label="Proof of Work Difficulty (Optional)"
            placeholder="Enter difficulty level"
            value={poW || ""}
            onChange={(e) => setPoW(Number(e.target.value))}
            fullWidth
          />
        </Box>

        <Box sx={{ pt: 2 }}>
          <Box display="flex" flexDirection="column" gap={2}>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? "Creating Poll..." : "Create Poll"}
            </Button>
            <Button
              variant="outlined"
              startIcon={
                showPreview ? <VisibilityOffIcon /> : <VisibilityIcon />
              }
              onClick={(e) => {
                e.preventDefault();
                setShowPreview(!showPreview);
              }}
              fullWidth
            >
              {showPreview ? "Hide Preview" : "Show Preview"}
            </Button>
            <Collapse in={showPreview}>
              <Box mt={1}>
                <PollPreview pollEvent={previewEvent} />
              </Box>
            </Collapse>
          </Box>
        </Box>
      </Stack>
    </form>
  );
};

export default PollTemplateForm;
