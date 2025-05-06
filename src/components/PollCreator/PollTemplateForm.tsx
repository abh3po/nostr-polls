import React, { useState } from "react";
import {
  Button,
  Card,
  Divider,
  Input,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
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

export type PollTypes =
  | "singlechoice"
  | "multiplechoice"
  | "rankedchoice"
  | undefined;

const PollTemplateForm = () => {
  const [pollContent, setPollContent] = useState<string>("");
  const [options, setOptions] = useState<Option[]>([]);
  const [pollType, setPollType] = useState<PollTypes>("singlechoice");
  const [poW, setPoW] = useState<number | null>(null);
  const [expiration, setExpiration] = useState<number | null>(null);

  const { poolRef } = useAppContext();
  const { user } = useUserContext();
  const { signer, requestLogin } = useSigner();
  let navigate = useNavigate();

  function generateOptionId() {
    return Math.random().toString(36).substr(2, 9);
  }

  const addOption = () => {
    let newOptions = [...options, [generateOptionId(), ""]];
    setOptions(newOptions as Option[]);
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
    <div style={{ alignItems: "center", width: "100%", maxWidth: "100%" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: "100%",
          alignItems: "center",
        }}
      >
        <Typography variant="h5" gutterBottom>
          Create A Poll
        </Typography>
        <form
          onSubmit={handleSubmit}
          style={{ border: "none", boxShadow: "none" }}
        >
          <Card
            style={{
              boxShadow: "none",
              width: "100%",
              maxWidth: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "left",
              padding: 20,
            }}
          >
            <TextField
              label="Poll questions or content?"
              value={pollContent}
              onChange={(e) => setPollContent(e.target.value)}
              required
              multiline
              style={{ borderBottom: "none", margin: 10 }}
              size="medium"
            />
            <OptionsCard
              onAddOption={addOption}
              onRemoveOption={removeOption}
              onEditOptions={onEditOptions}
              options={options}
            />
            <Select
              labelId="demo-select-small-label"
              id="demo-select-small"
              value={pollType}
              label="Age"
              onChange={handleChange}
              style={{ maxWidth: "200px", margin: 10 }}
            >
              <MenuItem value={"singlechoice"}>Single Choice Poll</MenuItem>
              <MenuItem value={"multiplechoice"}>Multiple Choice Poll</MenuItem>
              <MenuItem value={"rankedchoice"} disabled>
                Ranked Choice Poll
              </MenuItem>
            </Select>
            <Divider />
            <div style={{ margin: 10 }}>
              <Typography>Add Poll Expiration</Typography>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="Poll Expiration"
                  disablePast
                  onChange={(value: dayjs.Dayjs | null) => {
                    if (!value) return;
                    if (value?.isBefore(now)) {
                      alert("You cannot select a past date/time.");
                      setExpiration(null);
                      return;
                    } else if (value.isValid()) {
                      setExpiration(value.valueOf() / 1000);
                    }
                  }}
                  sx={{
                    marginTop: 3,
                    marginBottom: 3,
                  }}
                />
              </LocalizationProvider>
            </div>
            <Divider />
            <div style={{ margin: 10 }}>
              <Typography>Add Proof of Work Difficulty</Typography>
              <Input
                value={poW || ""}
                type="number"
                placeholder="Enter desired difficulty"
                style={{ maxWidth: "60%" }}
                onChange={(e) => setPoW(Number(e.target.value))}
              />
            </div>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              style={{ maxWidth: 100 }}
            >
              Submit
            </Button>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default PollTemplateForm;
