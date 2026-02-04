import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  TextField,
  Paper,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import { useNavigate, useParams } from "react-router-dom";
import { nip19 } from "nostr-tools";
import dayjs from "dayjs";
import { useDMContext } from "../../hooks/useDMContext";
import { useAppContext } from "../../hooks/useAppContext";
import { useUserContext } from "../../hooks/useUserContext";
import { getConversationId } from "../../nostr/nip17";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import { TextWithImages } from "../Common/Parsers/TextWithImages";

const ChatView: React.FC = () => {
  const { npub } = useParams<{ npub: string }>();
  const navigate = useNavigate();
  const { conversations, sendMessage, markAsRead } = useDMContext();
  const { profiles, fetchUserProfileThrottled } = useAppContext();
  const { user } = useUserContext();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          return (
            <Box
              key={msg.id}
              display="flex"
              justifyContent={isMine ? "flex-end" : "flex-start"}
            >
              <Paper
                elevation={1}
                sx={{
                  px: 2,
                  py: 1,
                  maxWidth: "70%",
                  borderRadius: 2,
                  backgroundColor: isMine
                    ? "primary.main"
                    : "action.hover",
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
                  <TextWithImages content={msg.content} />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: isMine
                      ? "primary.contrastText"
                      : "text.secondary",
                    opacity: 0.7,
                    display: "block",
                    textAlign: "right",
                    mt: 0.5,
                  }}
                >
                  {dayjs.unix(msg.created_at).format("HH:mm")}
                </Typography>
              </Paper>
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
