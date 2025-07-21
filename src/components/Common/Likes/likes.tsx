import React, { useEffect } from "react";
import { Tooltip, Typography } from "@mui/material";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import { useAppContext } from "../../../hooks/useAppContext";
import { Event, EventTemplate } from "nostr-tools/lib/types/core";
import { defaultRelays, signEvent } from "../../../nostr";
import { Favorite } from "@mui/icons-material";
import { useUserContext } from "../../../hooks/useUserContext";
import { useSigner } from "../../../contexts/signer-context";
import { useNotification } from "../../../contexts/notification-context";
import { NOTIFICATION_MESSAGES } from "../../../constants/notifications";

interface LikesProps {
  pollEvent: Event;
}

const Likes: React.FC<LikesProps> = ({ pollEvent }) => {
  const { likesMap, fetchLikesThrottled, poolRef, addEventToMap } =
    useAppContext();
  const { showNotification } = useNotification();

  const { signer } = useSigner();
  const { user } = useUserContext();

  const addLike = async () => {
    if (!user) {
      showNotification(NOTIFICATION_MESSAGES.LOGIN_TO_LIKE, "warning");
      return;
    }
    let event: EventTemplate = {
      content: "+",
      kind: 7,
      tags: [["e", pollEvent.id, defaultRelays[0]]],
      created_at: Math.floor(Date.now() / 1000),
    };
    let finalEvent = await signEvent(event, signer, user.privateKey);
    poolRef.current.publish(defaultRelays, finalEvent!);
    addEventToMap(finalEvent!);
  };

  const hasLiked = () => {
    if (!user) return false;
    return !!likesMap
      ?.get(pollEvent.id)
      ?.map((e) => e.pubkey)
      ?.includes(user.pubkey);
  };

  useEffect(() => {
    const fetchAndSetLikes = async () => {
      if (!likesMap?.get(pollEvent.id)) fetchLikesThrottled(pollEvent.id);
    };

    fetchAndSetLikes();
  }, [pollEvent.id, likesMap, fetchLikesThrottled, user]);

  const handleLike = async () => {
    if (hasLiked()) {
      //await removeLike(pollEvent.id, userPublicKey);
      //setLikes((prevLikes) => prevLikes.filter((like) => like !== userPublicKey));
    } else {
      await addLike();
    }
  };

  return (
    <div style={{ marginLeft: 20 }}>
      <Tooltip
        onClick={handleLike}
        style={{ color: "black" }}
        title={hasLiked() ? "Unlike" : "Like"}
      >
        <span
          style={{ cursor: "pointer", display: "flex", flexDirection: "row" }}
          onClick={handleLike}
        >
          {hasLiked() ? (
            <Favorite
              sx={(theme) => {
                return {
                  color: "#FAD13F",
                  "& path": {
                    stroke:
                      theme.palette.mode === "light" ? "#000000" : "#ffffff",
                    strokeWidth: 3,
                  },
                };
              }}
              style={{ display: "block" }}
            />
          ) : (
            <FavoriteBorder />
          )}
          <Typography>
            {likesMap?.get(pollEvent.id)?.length
              ? new Set(likesMap?.get(pollEvent.id)?.map((like) => like.pubkey))
                  .size
              : null}
          </Typography>
        </span>
      </Tooltip>
    </div>
  );
};

export default Likes;
