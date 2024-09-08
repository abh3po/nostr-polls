// PollResponseForm.tsx
import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  FormControl,
  MenuItem,
  Menu,
  CardActions,
  CardHeader,
  Avatar,
} from "@mui/material";
import { Event } from "nostr-tools/lib/types/core";
import { nip19 } from "nostr-tools";
import { defaultRelays, minePow, openProfileTab, signEvent } from "../../nostr";
import { FetchResults } from "./FetchResults";
import { SingleChoiceOptions } from "./SingleChoiceOptions";
import { MultipleChoiceOptions } from "./MultipleChoiceOptions";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import { useAppContext } from "../../hooks/useAppContext";
import PollComments from "../Common/Comments/PollComments";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { TextWithImages } from "../Common/TextWithImages";
import Likes from "../Common/Likes/likes";
import Zap from "../Common/Zaps/zaps";
import { Filters } from "./Filter";
import { useUserContext } from "../../hooks/useUserContext";
import { ProofofWorkModal } from "./ProofofWorkModal";
import { MiningTracker } from "../../nostr";

interface PollResponseFormProps {
  pollEvent: Event;
  userResponse?: Event;
}

const PollResponseForm: React.FC<PollResponseFormProps> = ({
  pollEvent,
  userResponse,
}) => {
  const [responses, setResponses] = useState<string[]>(
    userResponse?.tags.filter((t) => t[0] === "response")?.map((t) => t[1]) ||
      []
  );
  const [showResults, setShowResults] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [filterPubkeys, setFilterPubkeys] = useState<string[]>([]);
  const [showPoWModal, setShowPoWModal] = useState<boolean>(false);
  const { profiles, poolRef, fetchUserProfileThrottled } = useAppContext();
  const { user } = useUserContext();
  const [mingTracker, setMingingTracker] = useState(new MiningTracker());
  let difficulty = Number(
    pollEvent.tags.filter((t) => t[0] === "PoW")?.[0]?.[1]
  );

  const pollType =
    pollEvent.tags.find((t) => t[0] === "polltype")?.[1] || "singlechoice";

  useEffect(() => {
    if (userResponse && responses.length === 0) {
      setResponses(
        userResponse.tags
          .filter((t) => t[0] === "response")
          ?.map((t) => t[1]) || []
      );
    }
    if (!profiles?.has(pollEvent.pubkey)) {
      fetchUserProfileThrottled(pollEvent.pubkey);
    }
  }, [
    pollEvent,
    profiles,
    poolRef,
    fetchUserProfileThrottled,
    userResponse,
    responses,
  ]);

  const handleResponseChange = (optionValue: string) => {
    if (pollType === "singlechoice") {
      setResponses([optionValue]);
    } else if (pollType === "multiplechoice") {
      setResponses((prevResponses) =>
        prevResponses.includes(optionValue)
          ? prevResponses.filter((val) => val !== optionValue)
          : [...prevResponses, optionValue]
      );
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      alert("login to submit response!");
      return;
    }

    const responseEvent = {
      kind: 1018,
      content: "",
      tags: [
        ["e", pollEvent.id],
        ...responses.map((response) => ["response", response]),
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: user.pubkey,
    };
    let useEvent = responseEvent;
    if (difficulty) {
      let tracker = new MiningTracker();
      setMingingTracker(tracker);
      setShowPoWModal(true);
      let minedEvent = await minePow(responseEvent, difficulty, tracker).catch(
        (e) => {
          setShowPoWModal(false);
          return;
        }
      );
      if (!minedEvent) return;
      useEvent = minedEvent;
    }

    setShowPoWModal(false);
    const signedResponse = await signEvent(useEvent, user.privateKey);
    let relays = pollEvent.tags
      .filter((t) => t[0] === "relay")
      .map((t) => t[1]);
    relays = relays.length === 0 ? defaultRelays : relays;
    poolRef.current.publish(relays, signedResponse!);
    setShowResults(true);
  };

  const toggleResults = () => {
    setShowResults(!showResults);
  };

  const copyRawEvent = async () => {
    const rawEvent = JSON.stringify(pollEvent, null, 2);
    try {
      await navigator.clipboard.writeText(rawEvent);
      alert("Event copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy event:", error);
      alert("Failed to copy raw event.");
    }
  };

  const copyPollUrl = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/respond/${pollEvent.id}`
      );
      alert("Poll URL copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy event:", error);
      alert("Failed to copy raw event.");
    }
  };

  const label =
    pollEvent.tags.find((t) => t[0] === "label")?.[1] || pollEvent.content;
  const options = pollEvent.tags.filter((t) => t[0] === "option");

  return (
    <div>
      <Card
        variant="elevation"
        className="poll-response-form"
        style={{ margin: 10 }}
      >
        <form onSubmit={handleSubmitResponse}>
          <Card variant="outlined">
            <CardHeader
              title={<TextWithImages content={label} />}
              subheader={`required difficulty: ${difficulty || 0}`}
              avatar={
                <Avatar
                  src={
                    profiles?.get(pollEvent.pubkey)?.picture ||
                    DEFAULT_IMAGE_URL
                  }
                  onClick={() => {
                    openProfileTab(nip19.npubEncode(pollEvent.pubkey));
                  }}
                />
              }
              action={
                <div>
                  <Button
                    onClick={(e) => {
                      setIsDetailsOpen(!isDetailsOpen);
                      setAnchorEl(e.currentTarget);
                    }}
                    style={{ color: "black" }}
                    variant="text"
                  >
                    <MoreVertIcon />
                  </Button>
                  <Menu
                    open={isDetailsOpen}
                    anchorEl={anchorEl}
                    onClose={() => {
                      setAnchorEl(null);
                      setIsDetailsOpen(false);
                    }}
                  >
                    <MenuItem onClick={copyPollUrl}>Copy URL</MenuItem>
                    <MenuItem onClick={copyRawEvent}>Copy Raw Event</MenuItem>
                  </Menu>
                </div>
              }
              titleTypographyProps={{
                fontSize: 18,
                fontWeight: "bold",
              }}
            ></CardHeader>
            <CardContent>
              <FormControl component="fieldset">
                {!showResults ? (
                  pollType === "singlechoice" ? (
                    <SingleChoiceOptions
                      options={options as [string, string, string][]}
                      handleResponseChange={handleResponseChange}
                      response={responses}
                    />
                  ) : pollType === "multiplechoice" ? (
                    <MultipleChoiceOptions
                      options={options as [string, string, string][]}
                      handleResponseChange={handleResponseChange}
                      response={responses}
                    />
                  ) : null
                ) : (
                  <FetchResults
                    pollEvent={pollEvent}
                    filterPubkeys={filterPubkeys}
                    difficulty={difficulty}
                  />
                )}
              </FormControl>
              <CardActions>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <Button type="submit" variant="contained" color="primary">
                    Submit Response
                  </Button>
                  <div style={{ display: "flex", flexDirection: "row" }}>
                    {showResults ? (
                      <Filters
                        onChange={(pubkeys: string[]) => {
                          setFilterPubkeys(pubkeys);
                        }}
                      />
                    ) : null}
                    <Button
                      onClick={toggleResults}
                      color="secondary"
                      variant="contained"
                    >
                      {showResults ? "hide results" : "results"}
                    </Button>
                  </div>
                </div>
              </CardActions>
            </CardContent>
          </Card>
        </form>
        <CardContent>
          <div style={{ display: "flex" }}>
            <PollComments pollEventId={pollEvent.id} />
            <Likes pollEvent={pollEvent} />
            <Zap pollEvent={pollEvent} />
          </div>
        </CardContent>
      </Card>
      <ProofofWorkModal
        show={showPoWModal}
        tracker={mingTracker}
        targetDifficulty={difficulty}
      />
    </div>
  );
};

export default PollResponseForm;
