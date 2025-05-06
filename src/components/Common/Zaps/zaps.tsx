import React, { useEffect, useState } from "react";
import { Tooltip, Typography } from "@mui/material";
import { useAppContext } from "../../../hooks/useAppContext";
import { Event } from "nostr-tools/lib/types/core";
import { defaultRelays, signEvent } from "../../../nostr";
import { FlashOn } from "@mui/icons-material";
import { nip57 } from "nostr-tools";
import { useUserContext } from "../../../hooks/useUserContext";
import { styled } from "@mui/system";
import { getColorsWithTheme } from "../../../styles/theme";
import { useSigner } from "../../../contexts/signer-context";

interface ZapProps {
  pollEvent: Event;
}

const Wrapper = styled("div")(({ theme }) => ({
  ...getColorsWithTheme(theme, {
    color: "#000000",
  }),
}));

const Zap: React.FC<ZapProps> = ({ pollEvent }) => {
  const { fetchZapsThrottled, zapsMap, profiles } = useAppContext();
  const { user } = useUserContext();
  const { signer } = useSigner();
  const [hasZapped, setHasZapped] = useState<boolean>(false);
  useEffect(() => {
    // Fetch existing zaps for the poll event
    const fetchZaps = async () => {
      if (!zapsMap?.get(pollEvent.id)) {
        fetchZapsThrottled(pollEvent.id);
      }
      const fetchedZaps = zapsMap?.get(pollEvent.id) || [];
      const userZapped = fetchedZaps.some(
        (zap) => zap.tags.find((t) => t[0] === "P")?.[1] === user?.pubkey
      );
      setHasZapped(userZapped);
    };

    fetchZaps();
  }, [pollEvent.id, zapsMap, fetchZapsThrottled, user]);

  const getTotalZaps = () => {
    let amount = 0;
    zapsMap?.get(pollEvent.id)?.forEach((e) => {
      let zapRequestTag = e.tags.find((t) => t[0] === "description");
      if (zapRequestTag && zapRequestTag[1]) {
        try {
          const zapRequest = JSON.parse(zapRequestTag[1]);
          let requestAmount =
            zapRequest.tags.find((t: any) => t[0] === "amount")?.[1] / 1000 ||
            0;
          amount += requestAmount;
        } catch (e) {
          return;
        }
      }
    });
    return amount.toString();
  };

  const sendZap = async () => {
    if (!user) {
      alert("Log In to send zaps!");
      return;
    }
    let recipient = profiles?.get(pollEvent.pubkey);
    if (!recipient) {
      alert("Could not fetch recipient profile");
      return;
    }
    const zapAmount = prompt("Enter the amount to zap (in satoshis):");
    if (!zapAmount || isNaN(Number(zapAmount))) {
      alert("Invalid amount.");
      return;
    }

    let zapRequestEvent = nip57.makeZapRequest({
      profile: pollEvent.pubkey,
      event: pollEvent.id,
      amount: Number(zapAmount) * 1000,
      comment: "",
      relays: defaultRelays,
    });
    let serializedZapEvent = encodeURI(
      JSON.stringify(signEvent(zapRequestEvent, signer, user.privateKey))
    );
    let zapEndpoint = await nip57.getZapEndpoint(recipient.event);
    const zaprequestUrl =
      zapEndpoint +
      `?amount=${Number(zapAmount) * 1000}&nostr=${serializedZapEvent}`;
    const paymentRequest = await fetch(zaprequestUrl);
    const request = await paymentRequest.json();
    const openAppUrl = "lightning:" + request.pr;
    window.location.assign(openAppUrl);
    fetchZapsThrottled(pollEvent.id);
  };

  return (
    <Wrapper style={{ marginLeft: 20 }}>
      <Tooltip onClick={sendZap} title="Send a Zap">
        <span
          style={{ cursor: "pointer", display: "flex", flexDirection: "row" }}
        >
          {hasZapped ? (
            <FlashOn
              sx={(theme) => {
                return {
                  color: "#FAD13F",
                  "& path": {
                    ...getColorsWithTheme(theme, {
                      stroke: "#000000",
                    }),
                    strokeWidth: 2,
                  },
                };
              }}
            />
          ) : (
            <FlashOn
              sx={(theme) => ({
                color: theme.palette.mode === "light" ? "white" : "black",
                "& path": {
                  stroke: theme.palette.mode === "light" ? "black" : "white",
                  strokeWidth: 2,
                },
              })}
            />
          )}
          {zapsMap?.get(pollEvent.id) ? (
            <Typography>{getTotalZaps()}</Typography>
          ) : null}
        </span>
      </Tooltip>
    </Wrapper>
  );
};

export default Zap;
