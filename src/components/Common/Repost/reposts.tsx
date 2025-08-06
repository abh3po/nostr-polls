import React, { useEffect, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import RepeatIcon from "@mui/icons-material/Repeat";
import { Event, EventTemplate } from "nostr-tools";
import { useUserContext } from "../../../hooks/useUserContext";
import { useNotification } from "../../../contexts/notification-context";
import { NOTIFICATION_MESSAGES } from "../../../constants/notifications";
import { useAppContext } from "../../../hooks/useAppContext";
import { useRelays } from "../../../hooks/useRelays";
import { pool } from "../../../singletons";
import { signEvent } from "../../../nostr";

interface RepostButtonProps {
  event: Event;
}

const RepostButton: React.FC<RepostButtonProps> = ({ event }) => {
  const { user } = useUserContext();
  const { showNotification } = useNotification();
  const { relays } = useRelays();
  const { repostsMap, fetchRepostsThrottled, addEventToMap } = useAppContext();

  const [reposted, setReposted] = useState(false);

  useEffect(() => {
    const checkAndFetch = async () => {
      if (!repostsMap?.get(event.id)) {
        await fetchRepostsThrottled(event.id);
      } else if (user) {
        const repostedByUser = repostsMap
          .get(event.id)
          ?.some((e: Event) => e.pubkey === user.pubkey);
        setReposted(!!repostedByUser);
      }
    };

    checkAndFetch();
  }, [event.id, repostsMap, fetchRepostsThrottled, user]);

  const handleRepost = async () => {
    if (!user) {
      showNotification(NOTIFICATION_MESSAGES.LOGIN_TO_REPOST, "warning");
      return;
    }

    if (reposted) return;

    const isKind1 = event.kind === 1;

    const repostTemplate: EventTemplate = {
      kind: isKind1 ? 6 : 16,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["q", event.id, relays[0], event.pubkey],
        ["p", event.pubkey],
      ],
      content: isKind1 ? JSON.stringify(event) : "",
    };

    if (!isKind1) {
      repostTemplate.tags.push(["k", event.kind.toString()]);
    }

    try {
      const signedEvent = await signEvent(repostTemplate, user.privateKey);
      pool.publish(relays, signedEvent);
      addEventToMap(signedEvent);
      setReposted(true);
    } catch (error) {
      console.error("Repost failed:", error);
      showNotification("Failed to repost event", "error");
    }
  };

  return (
    <div style={{ marginLeft: 20 }}>
      <Tooltip
        onClick={handleRepost}
        style={{ color: "black" }}
        title={reposted ? "Reposted" : "Repost"}
      >
        <span
          style={{
            cursor: reposted ? "default" : "pointer",
            display: "flex",
            flexDirection: "row",
          }}
        >
          <RepeatIcon
            sx={
              reposted
                ? {
                    fontSize: 28, // 🔍 bigger icon
                    color: "#4CAF50",
                    "& path": {
                      stroke: "#4CAF50",
                      strokeWidth: 2,
                    },
                  }
                : {
                    fontSize: 20, // normal size when not reposted
                  }
            }
          />
        </span>
      </Tooltip>
    </div>
  );
};

export default RepostButton;
