import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
} from "@mui/material";
import { nip19, SimplePool, Event as NostrEvent, Filter } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import MovieMetadataModal from "./MovieMetadataModal";
import Rate from "../Ratings/Rate";
import { useAppContext } from "../../hooks/useAppContext";
import { useUserContext } from "../../hooks/useUserContext";
import { selectBestMetadataEvent } from "./utils";

interface MovieCardProps {
  imdbId: string;
  metadataEvent?: NostrEvent;
  previewMode?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({
  imdbId,
  metadataEvent,
  previewMode = false,
}) => {
  const [events, setEvents] = useState<NostrEvent[]>(
    metadataEvent ? [metadataEvent] : []
  );
  const [modalOpen, setModalOpen] = useState(false);
  const { fetchUserProfileThrottled, profiles } = useAppContext();
  const { user } = useUserContext();

  // Fetch metadata events
  useEffect(() => {
    if (previewMode) return;

    const pool = new SimplePool();
    const filter: Filter = {
      kinds: [30300],
      "#d": [`movie:${imdbId}`],
    };

    const unsub = pool.subscribeMany(defaultRelays, [filter], {
      onevent(e: NostrEvent) {
        setEvents((prev) => {
          const exists = prev.find((evt) => evt.id === e.id);
          return exists ? prev : [...prev, e];
        });
      },
    });

    return () => unsub.close();
  }, [imdbId, previewMode]);

  // Sorted event list by follows + created_at
  const activeEvent = useMemo(
    () => selectBestMetadataEvent(events, user?.follows),
    [events, user?.follows]
  );

  const title = activeEvent?.content || `No Metadata - ${imdbId}`;
  const poster = activeEvent?.tags.find((t) => t[0] === "poster")?.[1];
  const year = activeEvent?.tags.find((t) => t[0] === "year")?.[1];
  const summary = activeEvent?.tags.find((t) => t[0] === "summary")?.[1];
  const pubkey = activeEvent?.pubkey;
  const metadataUser = pubkey
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
            {activeEvent && (
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
                  "&:hover": {
                    backgroundColor: "black",
                  },
                }}
                title="Edit Metadata"
              >
                ✏️
              </Button>
            )}
          </Box>
        ) : (
          activeEvent && (
            <Box
              sx={{
                width: 120,
                height: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "grey.200",
              }}
            >
              <Button size="small" onClick={() => setModalOpen(true)}>
                Edit Metadata
              </Button>
            </Box>
          )
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
                Metadata by {metadataUser?.name || nip19.npubEncode(pubkey)}
              </Typography>
            )}
            <Rate entityId={imdbId} entityType="movie" />
            {!previewMode && !activeEvent && (
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={(e: any) => {
                  e.stopPropagation();
                  setModalOpen(true);
                }}
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
