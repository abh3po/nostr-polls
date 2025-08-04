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
import MovieMetadataModal from "./MovieMetadataModal";
import Rate from "../Ratings/Rate";
import { useAppContext } from "../../hooks/useAppContext";
import { useUserContext } from "../../hooks/useUserContext";
import { selectBestMetadataEvent } from "../../utils/utils";
import { useMetadata } from "../../hooks/MetadataProvider";
import { useNavigate } from "react-router/dist";

interface MovieCardProps {
  imdbId: string;
  metadataEvent?: Event;
}

const MovieCard: React.FC<MovieCardProps> = ({ imdbId, metadataEvent }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { fetchUserProfileThrottled, profiles } = useAppContext();
  const { user } = useUserContext();
  const { registerEntity, metadata } = useMetadata();

  useEffect(() => {
    registerEntity('movie', imdbId);
  }, [imdbId]);

  let activeEvent;
  if (!metadataEvent) {
    const events = metadata.get(imdbId) ?? [];

    activeEvent = selectBestMetadataEvent(events, user?.follows);
  } else {
    activeEvent = metadataEvent;
  }

  const title = activeEvent?.content || `No Metadata - ${imdbId}`;
  const poster = activeEvent?.tags.find((t) => t[0] === "poster")?.[1];
  const year = activeEvent?.tags.find((t) => t[0] === "year")?.[1];
  const summary = activeEvent?.tags.find((t) => t[0] === "summary")?.[1];
  const pubkey = activeEvent?.pubkey;
  const navigate = useNavigate();
  const metadataUser = metadataEvent
    ? { pubkey: pubkey, name: "Preview User" }
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
        {poster ? (
          <Box sx={{ position: "relative", width: 120 }}>
            <CardMedia
              component="img"
              sx={{ width: 120 }}
              image={poster}
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
              height: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "action.hover",
            }}
          >
            <Button size="small" onClick={() => setModalOpen(true)}>
              {activeEvent ? "Edit Metadata" : "Add Metadata"}
            </Button>
          </Box>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <CardContent>
            <div
              onClick={() => navigate(`${imdbId}`)}
              style={{ cursor: "pointer" }}
            >
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
            </div>
            {year && (
              <Typography variant="body2" color="text.secondary">
                {year}
              </Typography>
            )}
            {summary && (
              <Typography variant="body2" mt={1}>
                {summary}
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
            <Rate entityId={imdbId} entityType="movie" />
          </CardContent>
        </Box>
      </Card>

      <MovieMetadataModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        imdbId={imdbId}
      />
    </>
  );
};

export default MovieCard;
