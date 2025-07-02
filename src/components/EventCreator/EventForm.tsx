import React, { useState } from "react";
import {
  Button,
  Container,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Box,
  Card,
  Switch,
  FormControlLabel,
} from "@mui/material";
import Grid from '@mui/material/Grid2';
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import OptionsCard from "./OptionsCard";
import { Option } from "../../interfaces";
import { defaultRelays, signEvent } from "../../nostr";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../hooks/useAppContext";
import { useUserContext } from "../../hooks/useUserContext";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { useSigner } from "../../contexts/signer-context";
import { useNotification } from "../../contexts/notification-context";
import { NOTIFICATION_MESSAGES } from "../../constants/notifications";
import { NOSTR_EVENT_KINDS } from "../../constants/nostr";

export type PollTypes =
  | "singlechoice"
  | "multiplechoice"
  | "rankedchoice"
  | undefined;

function generateOptionId() {
  return Math.random().toString(36).substr(2, 9);
}

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

const EventForm = () => {
  const [eventContent, setEventContent] = useState<string>("");
  const [options, setOptions] = useState<Option[]>(() => [
    [generateOptionId(), ""],
    [generateOptionId(), ""],
  ]);
  const [pollType, setPollType] = useState<PollTypes>("singlechoice");
  const [poW, setPoW] = useState<number | null>(null);
  const [expiration, setExpiration] = useState<number | null>(null);
  const [isNote, setIsNote] = useState<boolean>(true);
  const { showNotification } = useNotification();


  const { poolRef } = useAppContext();
  const { user } = useUserContext();
  const { signer, requestLogin } = useSigner();
  let navigate = useNavigate();

  const addOption = () => {
    const newOptions: Option[] = [...options, [generateOptionId(), ""]];
    setOptions(newOptions);
  };

  const onEditOptions = (newOptions: Option[]) => {
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    const updatedOptions = [...options];
    updatedOptions.splice(index, 1);
    setOptions(updatedOptions);
  };

  const handleEventSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isNote) {
      publishNoteEvent(user?.privateKey);
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

    publishPollEvent(user?.privateKey);
  };

  const publishNoteEvent = async (secret?: string) => {
    try {
      if (!signer && !secret) {
        requestLogin();
        return;
      }

      if (!eventContent.trim()) {
        showNotification(NOTIFICATION_MESSAGES.EMPTY_NOTE_CONTENT, "error");
        return;
      }

      const noteEvent = {
        kind: NOSTR_EVENT_KINDS.TEXT_NOTE,
        content: eventContent,
        tags: [
          ...defaultRelays.map((relay) => ["relay", relay]),
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      const signedEvent = await signEvent(noteEvent, signer, secret);
      if (!signedEvent) {
        showNotification(NOTIFICATION_MESSAGES.NOTE_SIGN_FAILED, "error");
        return;
      }

      poolRef.current.publish(defaultRelays, signedEvent);
      showNotification(NOTIFICATION_MESSAGES.NOTE_PUBLISHED_SUCCESS, "success");
      navigate("/feeds/notes");
    } catch (error) {
      console.error("Error publishing note:", error);
      showNotification(NOTIFICATION_MESSAGES.NOTE_PUBLISH_FAILED, "error");
    }
  };

  const publishPollEvent = async (secret?: string) => {
    try {
      if (!signer && !secret) {
        requestLogin();
        return;
      }

      if (!eventContent.trim()) {
        showNotification(NOTIFICATION_MESSAGES.EMPTY_POLL_QUESTION, "error");
        return;
      }

      const pollEvent = {
        kind: NOSTR_EVENT_KINDS.POLL,
        content: eventContent,
        tags: [
          ...options.map((option: Option) => ["option", option[0], option[1]]),
          ...defaultRelays.map((relay) => ["relay", relay]),
        ],
        created_at: Math.floor(Date.now() / 1000),
      };
      if (poW) pollEvent.tags.push(["PoW", poW.toString()]);
      if (pollType) {
        pollEvent.tags.push(["polltype", pollType]);
      }
      if (expiration) {
        pollEvent.tags.push(["endsAt", expiration.toString()]);
      }

      const signedEvent = await signEvent(pollEvent, signer, secret);
      if (!signedEvent) {
        showNotification(NOTIFICATION_MESSAGES.POLL_SIGN_FAILED, "error");
        return;
      }

      poolRef.current.publish(defaultRelays, signedEvent);
      showNotification(NOTIFICATION_MESSAGES.POLL_PUBLISHED_SUCCESS, "success");
      navigate("/feeds/polls");
    } catch (error) {
      console.error("Error publishing poll:", error);
      showNotification(NOTIFICATION_MESSAGES.POLL_PUBLISH_FAILED, "error");
    }
  };

  const handleChange = (event: SelectChangeEvent) => {
    setPollType(event.target.value as PollTypes);
  };
  let now = dayjs();

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ mb: 1 }}
        >
          {isNote ? "Create A Note" : "Create A Poll"}
        </Typography>
      </Box>

      <Card
        component="form"
        onSubmit={handleEventSubmit}
        elevation={2}
        sx={{ p: 3 }}
      >
        <Stack spacing={4}>
          {/* Content Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                {isNote ? "Note" : "Poll"}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={!isNote}
                    onChange={() => setIsNote((prev) => !prev)}
                    color="primary"
                  />
                }
                label={"Switch to Poll"}
                labelPlacement="end"
                sx={{ ml: 2 }}
              />
            </Box>
            <TextField
              label={isNote ? "Note Content" : "Poll Question"}
              value={eventContent}
              onChange={(e) => setEventContent(e.target.value)}
              required
              multiline
              minRows={4}
              maxRows={8}
              fullWidth
              placeholder={isNote
                ? "Share your thoughts."
                : "Ask a question."
              }
            />
          </Box>

          {/* Options Section - Only show when options exist */}
          {!isNote && (
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
          )}

          {/* Poll Settings Section - Only show when options exist */}
          {!isNote && (
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
                          showNotification(NOTIFICATION_MESSAGES.PAST_DATE_ERROR, "error");
                          setExpiration(null);
                          return;
                        } else if (value.isValid()) {
                          setExpiration(value.unix());
                        }
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Advanced Settings Section - Only show when options exist */}
          {!isNote && (
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
          )}

          {/* Submit Button */}
          <Box sx={{ pt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
            >
              {isNote ? "Create Note" : "Create Poll"}
            </Button>
          </Box>
        </Stack>
      </Card>
    </Container>
  );
};

export default EventForm;
