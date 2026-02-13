import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  TextField,
  Paper,
  Chip,
  Modal,
  Popover,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import AddReactionOutlinedIcon from "@mui/icons-material/AddReactionOutlined";
import { useNavigate, useParams } from "react-router-dom";
import { nip19 } from "nostr-tools";
import dayjs from "dayjs";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useTheme } from "@mui/material/styles";
import { useDMContext } from "../../hooks/useDMContext";
import { useAppContext } from "../../hooks/useAppContext";
import { useUserContext } from "../../hooks/useUserContext";
import { getConversationId } from "../../nostr/nip17";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import { TextWithImages } from "../Common/Parsers/TextWithImages";

const QUICK_EMOJIS = [
  "\u{1F44D}",
  "\u{2764}\u{FE0F}",
  "\u{1F602}",
  "\u{1F622}",
  "\u{1F525}",
];

// Renders an emoji, supporting custom emoji shortcodes like :name:
const RenderEmoji: React.FC<{ content: string; tags?: string[][] }> = ({ content, tags }) => {
  const match = content.match(/^:([a-zA-Z0-9_]+):$/);
  if (match && tags) {
    const shortcode = match[1];
    const emojiTag = tags.find(t => t[0] === "emoji" && t[1] === shortcode);
    if (emojiTag && emojiTag[2]) {
      return (
        <img
          src={emojiTag[2]}
          alt={`:${shortcode}:`}
          title={`:${shortcode}:`}
          style={{ height: "1em", width: "auto", verticalAlign: "middle" }}
        />
      );
    }
  }
  return <>{content}</>;
};

const ChatView: React.FC = () => {
  const { npub } = useParams<{ npub: string }>();
  const navigate = useNavigate();
  const { conversations, sendMessage, sendReaction, markAsRead } =
    useDMContext();
  const { profiles, fetchUserProfileThrottled } = useAppContext();
  const { user } = useUserContext();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showPickerForMsg, setShowPickerForMsg] = useState<string | null>(null);
  const [reactionAnchor, setReactionAnchor] = useState<HTMLElement | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  // Decode npub to pubkey
  let recipientPubkey: string | null = null;
  try {
    if (npub) {
      const decoded = nip19.decode(npub);
      if (decoded.type === "npub") {
        recipientPubkey = decoded.data;
      } else if (decoded.type === "nprofile") {
        recipientPubkey = decoded.data.pubkey;
      }
    }
  } catch {
    // invalid npub
  }

  // Find conversation
  const conversationId =
    user && recipientPubkey
      ? getConversationId(user.pubkey, [recipientPubkey])
      : null;
  const conversation = conversationId
    ? conversations.get(conversationId)
    : null;

  // Fetch profile
  useEffect(() => {
    if (recipientPubkey && !profiles?.get(recipientPubkey)) {
      fetchUserProfileThrottled(recipientPubkey);
    }
  }, [recipientPubkey, profiles, fetchUserProfileThrottled]);

  // Mark as read
  useEffect(() => {
    if (conversationId && conversation && conversation.unreadCount > 0) {
      markAsRead(conversationId);
    }
  }, [conversationId, conversation, markAsRead]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages?.length]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !recipientPubkey || sending) return;

    const content = input.trim();
    setInput("");
    setSending(true);

    try {
      await sendMessage(recipientPubkey, content);
    } catch (e) {
      console.error("Failed to send message:", e);
      setInput(content); // Restore on failure
    } finally {
      setSending(false);
    }
  }, [input, recipientPubkey, sending, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReaction = useCallback(
    async (emoji: string, messageId: string) => {
      if (!recipientPubkey) return;
      setShowPickerForMsg(null);
      setReactionAnchor(null);
      try {
        await sendReaction(recipientPubkey, emoji, messageId);
      } catch (e) {
        console.error("Failed to send reaction:", e);
      }
    },
    [recipientPubkey, sendReaction],
  );

  if (!recipientPubkey) {
    return (
      <Box maxWidth={800} mx="auto" px={2} py={4}>
        <Typography color="error">Invalid recipient</Typography>
      </Box>
    );
  }

  const recipientProfile = profiles?.get(recipientPubkey);
  const recipientName =
    recipientProfile?.display_name ||
    recipientProfile?.name ||
    nip19.npubEncode(recipientPubkey).slice(0, 12) + "...";
  const recipientPicture = recipientProfile?.picture || DEFAULT_IMAGE_URL;

  const messages = conversation?.messages || [];

  return (
    <Box
      maxWidth={800}
      mx="auto"
      display="flex"
      flexDirection="column"
      height="calc(100vh - 64px)"
    >
      {/* Top bar */}
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={2}
        py={1}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <IconButton onClick={() => navigate("/messages")} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Avatar
          src={recipientPicture}
          sx={{ width: 36, height: 36, cursor: "pointer" }}
          onClick={() =>
            navigate(`/profile/${nip19.npubEncode(recipientPubkey!)}`)
          }
        />
        <Typography
          variant="subtitle1"
          sx={{ cursor: "pointer" }}
          onClick={() =>
            navigate(`/profile/${nip19.npubEncode(recipientPubkey!)}`)
          }
        >
          {recipientName}
        </Typography>
      </Box>

      {/* Messages area */}
      <Box
        flex={1}
        overflow="auto"
        px={2}
        py={1}
        display="flex"
        flexDirection="column"
        gap={1}
      >
        {messages.length === 0 && (
          <Box
            flex={1}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Typography variant="body2" color="text.secondary">
              No messages yet. Say hello!
            </Typography>
          </Box>
        )}
        {messages.map((msg) => {
          const isMine = msg.pubkey === user?.pubkey;
          const msgReactions = conversation?.reactions?.get(msg.id) || [];

          // Group reactions by emoji with counts
          const groupedReactions = msgReactions.reduce<
            Record<string, { emoji: string; count: number; pubkeys: string[]; tags?: string[][] }>
          >((acc, r) => {
            if (!acc[r.emoji]) {
              acc[r.emoji] = { emoji: r.emoji, count: 0, pubkeys: [], tags: r.tags };
            }
            acc[r.emoji].count++;
            acc[r.emoji].pubkeys.push(r.pubkey);
            return acc;
          }, {});

          return (
            <Box
              key={msg.id}
              display="flex"
              flexDirection="column"
              alignItems={isMine ? "flex-end" : "flex-start"}
              sx={{
                "&:hover .reaction-trigger": { opacity: 1 },
              }}
            >
              <Box display="flex" alignItems="center" gap={0.5}>
                {isMine && (
                  <IconButton
                    className="reaction-trigger"
                    size="small"
                    sx={{ opacity: 0, transition: "opacity 0.2s" }}
                    onClick={(e) => {
                      setShowPickerForMsg(msg.id);
                      setReactionAnchor(e.currentTarget);
                    }}
                  >
                    <AddReactionOutlinedIcon fontSize="small" />
                  </IconButton>
                )}
                <Paper
                  elevation={1}
                  sx={{
                    px: 2,
                    py: 1,
                    maxWidth: "85%",
                    borderRadius: 2,
                    overflow: "hidden",
                    backgroundColor: isMine ? "primary.main" : "action.hover",
                  }}
                >
                  <Box
                    sx={{
                      color: isMine ? "primary.contrastText" : "text.primary",
                      wordBreak: "break-word",
                      fontSize: "0.875rem",
                      "& a": {
                        color: isMine ? "primary.contrastText" : "#FAD13F",
                      },
                    }}
                  >
                    <TextWithImages content={msg.content} tags={msg.tags} />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: isMine ? "primary.contrastText" : "text.secondary",
                      opacity: 0.7,
                      display: "block",
                      textAlign: "right",
                      mt: 0.5,
                    }}
                  >
                    {dayjs.unix(msg.created_at).format("HH:mm")}
                  </Typography>
                </Paper>
                {!isMine && (
                  <IconButton
                    className="reaction-trigger"
                    size="small"
                    sx={{ opacity: 0, transition: "opacity 0.2s" }}
                    onClick={(e) => {
                      setShowPickerForMsg(msg.id);
                      setReactionAnchor(e.currentTarget);
                    }}
                  >
                    <AddReactionOutlinedIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              {/* Reaction badges */}
              {Object.keys(groupedReactions).length > 0 && (
                <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                  {Object.values(groupedReactions).map((r) => (
                    <Chip
                      key={r.emoji}
                      label={
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <RenderEmoji content={r.emoji} tags={r.tags} />
                          {r.count > 1 && <span>{r.count}</span>}
                        </Box>
                      }
                      size="small"
                      variant="outlined"
                      onClick={() => handleReaction(r.emoji, msg.id)}
                      sx={{
                        height: 24,
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Quick react popover */}
              <Popover
                open={showPickerForMsg === msg.id && Boolean(reactionAnchor)}
                anchorEl={reactionAnchor}
                onClose={() => {
                  setShowPickerForMsg(null);
                  setReactionAnchor(null);
                }}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                transformOrigin={{ vertical: "bottom", horizontal: "center" }}
              >
                <Box display="flex" alignItems="center" p={0.5} gap={0.5}>
                  {QUICK_EMOJIS.map((emoji) => (
                    <IconButton
                      key={emoji}
                      size="small"
                      onClick={() => handleReaction(emoji, msg.id)}
                    >
                      <span style={{ fontSize: 20 }}>{emoji}</span>
                    </IconButton>
                  ))}
                  <IconButton
                    size="small"
                    onClick={() => setShowPickerForMsg(`picker_${msg.id}`)}
                  >
                    <AddReactionOutlinedIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Popover>

              {/* Full emoji picker modal */}
              <Modal
                open={showPickerForMsg === `picker_${msg.id}`}
                onClose={() => setShowPickerForMsg(null)}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 2,
                    borderRadius: 2,
                    overscrollBehavior: "contain",
                    touchAction: "pan-y",
                  }}
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  <EmojiPicker
                    theme={
                      theme.palette.mode === "light"
                        ? ("light" as Theme)
                        : ("dark" as Theme)
                    }
                    onEmojiClick={(emojiData) =>
                      handleReaction(emojiData.emoji, msg.id)
                    }
                  />
                </Box>
              </Modal>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input area */}
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={2}
        py={1.5}
        sx={{ borderTop: 1, borderColor: "divider" }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          multiline
          maxRows={4}
          disabled={sending}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!input.trim() || sending}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default ChatView;
