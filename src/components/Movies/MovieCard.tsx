import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
} from "@mui/material";
import {
  nip19,
  SimplePool,
  UnsignedEvent as NostrEvent,
  UnsignedEvent,
} from "nostr-tools";
import { defaultRelays } from "../../nostr";
import MovieMetadataModal from "./MovieMetadataModal";
import Rate from "../Ratings/Rate";
import { useAppContext } from "../../hooks/useAppContext";

interface MovieCardProps {
  imdbId: string;
  metadataEvent?: UnsignedEvent;
  previewMode?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({
  imdbId,
  metadataEvent,
  previewMode = false,
}) => {
  const [event, setEvent] = useState<UnsignedEvent | null>(
    metadataEvent || null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const { fetchUserProfileThrottled, profiles } = useAppContext();

  useEffect(() => {
    if (event || previewMode) return;

    const pool = new SimplePool();
    const unsub = pool.subscribeMany(
      defaultRelays,
      [
        {
          kinds: [30300],
          "#d": [`movie:${imdbId}`],
        },
      ],
      {
        onevent(e) {
          setEvent(e);
          unsub.close(); // stop after first event
        },
        oneose() {
          // optional: handle "end of stream"
        },
      }
    );

    return () => unsub.close();
  }, [imdbId, event, previewMode]);

  const title = event?.content || "Untitled";
  const poster = event?.tags.find((t) => t[0] === "poster")?.[1];
  const year = event?.tags.find((t) => t[0] === "year")?.[1];
  const summary = event?.tags.find((t) => t[0] === "summary")?.[1];
  const pubkey = event?.pubkey;
  let metadataUser;
  if (pubkey) {
    metadataUser = profiles?.get(pubkey);
    if (!metadataUser) fetchUserProfileThrottled(pubkey);
  }

  return (
    <>
      <Card sx={{ display: "flex", mb: 2 }}>
        {poster && (
          <CardMedia
            component="img"
            sx={{ width: 120 }}
            image={poster}
            alt={title}
          />
        )}
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <CardContent>
            <Typography variant="h6">{title}</Typography>
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
              <Typography variant="caption" color="text.secondary">
                Metadata by {metadataUser?.name}
              </Typography>
            )}
            {<Rate entityId={imdbId} entityType="movie" />}
            {!event && !previewMode && (
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => setModalOpen(true)}
              >
                Add Movie Info?
              </Button>
            )}
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
