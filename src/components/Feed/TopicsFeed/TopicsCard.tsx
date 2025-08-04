import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
} from "@mui/material";
import { Event, nip19 } from "nostr-tools";
import Rate from "../../Ratings/Rate";
import { useAppContext } from "../../../hooks/useAppContext";
import { useUserContext } from "../../../hooks/useUserContext";
import { selectBestMetadataEvent } from "../../../utils/utils"; // ✅ reuse
import TopicMetadataModal from "./TopicMetadataModal";
import { useMetadata } from "../../../hooks/MetadataProvider";

interface TopicCardProps {
  tag: string;
  metadataEvent?: Event;
}

const TopicCard: React.FC<TopicCardProps> = ({ tag, metadataEvent }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useUserContext();
  const { fetchUserProfileThrottled, profiles } = useAppContext();
  const { registerEntity, metadata } = useMetadata();

  useEffect(() => {
    registerEntity("hashtag", tag);
  }, [tag]);

  let activeEvent: Event | null;
  if (!metadataEvent) {
    const events = metadata.get(tag) ?? [];
    activeEvent = selectBestMetadataEvent(events, user?.follows);
  } else {
    activeEvent = metadataEvent;
  }

  const title = `${tag}`;
  const thumb = activeEvent?.tags.find((t) => t[0] === "image")?.[1];
  const description = activeEvent?.tags.find(
    (t) => t[0] === "description"
  )?.[1];
  const pubkey = activeEvent?.pubkey;

  const metadataUser = metadataEvent
    ? { pubkey, name: "Preview User" }
    : pubkey
    ? profiles?.get(pubkey) ||
      (() => {
        fetchUserProfileThrottled(pubkey);
        return null;
      })()
    : null;

  return (
    <>
      <Card sx={{ display: "flex", mb: 2 }}>
        {thumb ? (
          <Box sx={{ position: "relative", width: 120 }}>
            <CardMedia
              component="img"
              image={thumb}
              sx={{ width: 120, height: 120 }}
              alt={title}
            />
            <Button
              size="small"
              variant="text"
              onClick={() => setModalOpen(true)}
              sx={{
                position: "absolute",
                top: 4,
                right: 4,
                minWidth: "auto",
                p: 0.5,
                backgroundColor: "black",
                borderRadius: "50%",
              }}
              title="Edit Metadata"
            >
              ✏️
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              width: 120,
              height: 120,
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Button size="small" onClick={() => setModalOpen(true)}>
              {activeEvent ? "Edit" : "Add"} Metadata
            </Button>
          </Box>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <CardContent>
            <Typography
              variant="h6"
              sx={{
                display: "inline-block",
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              {title}
            </Typography>

            {description && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {description}
              </Typography>
            )}

            {pubkey && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ wordBreak: "break-word", whiteSpace: "normal" }}
              >
                Metadata by {metadataUser?.name || nip19.npubEncode(pubkey)}
              </Typography>
            )}

            <Rate entityId={tag} entityType="hashtag" />
          </CardContent>
        </Box>
      </Card>

      <TopicMetadataModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
        }}
        topic={tag}
      />
    </>
  );
};

export default TopicCard;
