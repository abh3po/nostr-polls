import React, { useState } from "react";
import {
  Button,
  Container,
  Divider,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  FormLabel,
  Paper,
} from "@mui/material";
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

export type PollTypes =
  | "singlechoice"
  | "multiplechoice"
  | "rankedchoice"
  | undefined;

function generateOptionId() {
  return Math.random().toString(36).substr(2, 9);
}

const PollTemplateForm = () => {
  const [pollContent, setPollContent] = useState<string>("");
  const [options, setOptions] = useState<Option[]>(() => [
    [generateOptionId(), ""],
    [generateOptionId(), ""],
  ]);
  const [pollType, setPollType] = useState<PollTypes>("singlechoice");
  const [poW, setPoW] = useState<number | null>(null);
  const [expiration, setExpiration] = useState<number | null>(null);
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
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (options.length < 1) {
      showNotification(NOTIFICATION_MESSAGES.MIN_POLL_OPTIONS, "error");
      return;
    }

    if (options.some((option) => option[1].trim() === "")) {
      showNotification(NOTIFICATION_MESSAGES.EMPTY_POLL_OPTIONS, "error");
      return;
    }
    publishPoll(user?.privateKey);
  };

  const publishPoll = async (secret?: string) => {
    if (!signer && !secret) {
      requestLogin();
      return;
    }
    const pollEvent = {
      kind: 1068,
      content: pollContent,
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
    let signedEvent = await signEvent(pollEvent, signer, secret);
    poolRef.current.publish(defaultRelays, signedEvent!);
    navigate("/");
  };

  const handleChange = (event: SelectChangeEvent) => {
    setPollType(event.target.value as PollTypes);
  };
  let now = dayjs();

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        Create A Poll
      </Typography>
      
      <Paper 
        component="form" 
        onSubmit={handleSubmit} 
        elevation={1}
        sx={{ p: 3 }}
      >
        <Stack spacing={3}>
          <TextField
            label="Poll Question"
            value={pollContent}
            onChange={(e) => setPollContent(e.target.value)}
            required
            multiline
            minRows={3}
            fullWidth
          />
          
          <OptionsCard
            onAddOption={addOption}
            onRemoveOption={removeOption}
            onEditOptions={onEditOptions}
            options={options}
          />
          
          <FormControl fullWidth>
            <InputLabel id="poll-type-label">Poll Type</InputLabel>
            <Select
              labelId="poll-type-label"
              id="poll-type-select"
              value={pollType}
              label="Poll Type"
              onChange={handleChange}
            >
              <MenuItem value={"singlechoice"}>Single Choice Poll</MenuItem>
              <MenuItem value={"multiplechoice"}>Multiple Choice Poll</MenuItem>
              <MenuItem value={"rankedchoice"} disabled>
                Ranked Choice Poll
              </MenuItem>
            </Select>
          </FormControl>
          
          <Divider />
          
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">Poll Expiration (Optional)</FormLabel>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Expiration Date"
                disablePast
                onChange={(value: dayjs.Dayjs | null) => {
                  if (!value) return;
                  if (value?.isBefore(now)) {
                    showNotification(NOTIFICATION_MESSAGES.PAST_DATE_ERROR, "error");
                    setExpiration(null);
                    return;
                  } else if (value.isValid()) {
                    setExpiration(value.valueOf() / 1000);
                  }
                }}
                slotProps={{
                  textField: { fullWidth: true }
                }}
              />
            </LocalizationProvider>
          </FormControl>
          
          <Divider />
          
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">Proof of Work Difficulty (Optional)</FormLabel>
            <TextField
              type="number"
              placeholder="Difficulty level"
              value={poW || ""}
              onChange={(e) => setPoW(Number(e.target.value))}
              fullWidth
            />
          </FormControl>
          
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
          >
            Create Poll
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default PollTemplateForm;
