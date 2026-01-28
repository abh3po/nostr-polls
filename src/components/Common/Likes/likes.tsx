import React, { useEffect, useState } from "react";
import { Tooltip, Box, IconButton, useTheme, Modal } from "@mui/material";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useAppContext } from "../../../hooks/useAppContext";
import { Event, EventTemplate } from "nostr-tools/lib/types/core";
import { signEvent } from "../../../nostr";
import { useRelays } from "../../../hooks/useRelays";
import { useUserContext } from "../../../hooks/useUserContext";
import { useNotification } from "../../../contexts/notification-context";
import { NOTIFICATION_MESSAGES } from "../../../constants/notifications";
import { pool } from "../../../singletons";

interface LikesProps {
  pollEvent: Event;
}

const Likes: React.FC<LikesProps> = ({ pollEvent }) => {
  const { likesMap, fetchLikesThrottled, addEventToMap } = useAppContext();
  const { showNotification } = useNotification();
  const { user } = useUserContext();
  const { relays } = useRelays();
  const [showPicker, setShowPicker] = useState(false);
  const theme = useTheme();

  const userReaction = () => {
    if (!user) return null;
    return likesMap?.get(pollEvent.id)?.find((r) => r.pubkey === user.pubkey)
      ?.content;
  };

  const addReaction = async (emoji: string) => {
    if (!user) {
      showNotification(NOTIFICATION_MESSAGES.LOGIN_TO_LIKE, "warning");
      return;
    }

    const event: EventTemplate = {
      content: emoji,
      kind: 7,
      tags: [["e", pollEvent.id, relays[0]]],
      created_at: Math.floor(Date.now() / 1000),
    };

    const finalEvent = await signEvent(event, user.privateKey);
    pool.publish(relays, finalEvent!);
    addEventToMap(finalEvent!);
    setShowPicker(false);
  };

  useEffect(() => {
    if (!likesMap?.get(pollEvent.id)) {
      fetchLikesThrottled(pollEvent.id);
    }
  }, [pollEvent.id, likesMap, fetchLikesThrottled, user]);

  // Compute top 2 emojis + count
  const getTopEmojis = () => {
    const reactions = likesMap?.get(pollEvent.id) || [];
    const counts: Record<string, number> = {};
    reactions.forEach((r) => {
      counts[r.content] = (counts[r.content] || 0) + 1;
    });
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([emoji, count]) => ({ emoji, count }));
    return sorted;
  };

  const topEmojis = getTopEmojis();
  const remainingCount = Math.max(0, topEmojis.length - 2);

  return (
    <Box
      display="flex"
      alignItems="center"
      ml={2}
      position="relative"
      sx={{ p: 0, my: -5 }}
    >
      {/* Heart / User emoji */}
      <Tooltip
        title={userReaction() ? "Change reaction" : "React"}
        onClick={() => setShowPicker(true)}
      >
        <IconButton size="small" sx={{ p: 0 }}>
          {userReaction() || <FavoriteBorder sx={{ p: 0 }} />}
        </IconButton>
      </Tooltip>

      {/* Top 2 emojis next to button */}
      <Box display="flex" alignItems="center" ml={1} gap={0.5}>
        {topEmojis.slice(0, 2).map((r) => (
          <span key={r.emoji} style={{ fontSize: 18 }}>
            {r.emoji}
          </span>
        ))}
        {topEmojis.length > 2 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "#FAD13F",
              color: "#000",
              fontSize: 12,
            }}
          >
            +{topEmojis.length - 2}
          </span>
        )}
      </Box>

      {/* Emoji picker modal */}
      <Modal
        open={showPicker}
        onClose={() => setShowPicker(false)}
      >
        <Box
          sx={{
            position: "absolute" as const,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 2,
            borderRadius: 2,
          }}
        >
          <EmojiPicker
            theme={
              theme.palette.mode === "light"
                ? ("light" as Theme)
                : ("dark" as Theme)
            }
            onEmojiClick={(emojiData) => addReaction(emojiData.emoji)}
          />
        </Box>
      </Modal>
    </Box>
  );
};

export default Likes;
