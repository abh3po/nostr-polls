import React, { useEffect, useState } from "react";
import { Event, Filter, nip19, SimplePool } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import { Notes } from "../Notes";
import { useUserContext } from "../../hooks/useUserContext";
import {
  Avatar,
  Button,
  CircularProgress,
  Tooltip,
  Typography,
} from "@mui/material";
import RateEventCard from "../Ratings/RateEventCard";
import RateEventModal from "../Ratings/RateEventModal";
import { useSigner } from "../../contexts/signer-context";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import { useAppContext } from "../../hooks/useAppContext";

const NOTES_BATCH_SIZE = 10;

const NotesFeed: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"following" | "reacted">(
    "following"
  );
  const [reactedEvents, setReactedEvents] = useState<Map<string, Event>>(
    new Map()
  );
  const [reactionEvents, setReactionEvents] = useState<Map<string, Event>>(
    new Map()
  );
  const [events, setEvents] = useState<Map<string, Event>>(new Map());
  const [loadingMore, setLoadingMore] = useState(false);
  const { user } = useUserContext();
  const { requestLogin } = useSigner();
  const [modalOpen, setModalOpen] = useState(false);
  const { profiles, fetchUserProfileThrottled } = useAppContext();

  useEffect(() => {
    if (!events.size && user) fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (activeTab === "reacted" && reactedEvents.size === 0) {
      fetchReactedNotes();
    }
  }, [activeTab]);

  const fetchReactedNotes = async () => {
    if (!user || !user.follows?.length) return;
    const pool = new SimplePool();

    // Reactions are kind 7
    const reactionFilter: Filter = {
      kinds: [7],
      authors: user.follows,
      limit: 10, // adjust as needed
    };

    const newReactionEvents = await pool.querySync(
      defaultRelays,
      reactionFilter
    );
    const updatedReactionEvents = new Map<string, Event>();
    newReactionEvents.forEach((e) => updatedReactionEvents.set(e.id, e));
    setReactionEvents(updatedReactionEvents);
    const reactedNoteIds = newReactionEvents
      .map((e) => e.tags.find((tag) => tag[0] === "e")?.[1])
      .filter(Boolean);

    // Deduplicate note IDs
    const uniqueNoteIds = Array.from(new Set(reactedNoteIds));

    const noteFilter: Filter = {
      kinds: [1],
      ids: uniqueNoteIds.filter((id) => id !== undefined),
    };

    const noteEvents = await pool.querySync(defaultRelays, noteFilter);

    const updated = new Map<string, Event>();
    noteEvents.forEach((e) => updated.set(e.id, e));
    setReactedEvents(updated);
  };

  const fetchNotes = async () => {
    if (!user || !user.follows || user.follows.length === 0) return;
    if (loadingMore) return;

    setLoadingMore(true);
    const pool = new SimplePool();

    const filter: Filter = {
      kinds: [1],
      authors: Array.from(user.follows),
      limit: NOTES_BATCH_SIZE,
    };
    if (events.size > 0)
      // Calculate the "since" parameter based on the latest event in the current events map
      filter.until = Array.from(events.values()).sort(
        (a, b) => a.created_at - b.created_at
      )[0].created_at;
    const fetchedEvents = await pool.querySync(defaultRelays, filter);
    setEvents((prev) => {
      const updated = new Map(prev);
      fetchedEvents.forEach((e) => updated.set(e.id, e));
      return updated;
    });
    setLoadingMore(false);
  };

  const handleLoadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    fetchNotes();
  };

  const sortedEvents = Array.from(events.values()).sort(
    (a, b) => b.created_at - a.created_at
  );

  return (
    <>
      <div style={{ display: "flex", gap: "1rem", margin: "1rem 0" }}>
        <Button
          variant={activeTab === "following" ? "contained" : "outlined"}
          onClick={() => setActiveTab("following")}
        >
          Following
        </Button>
        <Button
          variant={activeTab === "reacted" ? "contained" : "outlined"}
          onClick={() => setActiveTab("reacted")}
        >
          Reacted by Contacts
        </Button>
      </div>

      <RateEventCard onClick={() => setModalOpen(true)} />

      <Typography>
        {activeTab === "following"
          ? "Notes from people you follow"
          : "Notes reacted to by contacts"}
      </Typography>

      {activeTab === "following" &&
        sortedEvents.map((e) => <Notes event={e} key={e.id} />)}

      {activeTab === "reacted" &&
        Array.from(reactedEvents.values())
          .sort((a, b) => b.created_at - a.created_at)
          .map((note) => {
            const matchingReactions = Array.from(
              reactionEvents.values()
            ).filter((r) => {
              const taggedNoteId = r.tags.find((tag) => tag[0] === "e")?.[1];
              return taggedNoteId === note.id;
            });

            const emojiGroups: Record<string, string[]> = {};

            matchingReactions.forEach((r) => {
              const emoji = r.content || "👍";
              if (!emojiGroups[emoji]) emojiGroups[emoji] = [];
              emojiGroups[emoji].push(r.pubkey);

              // Fetch profile if missing
              if (!profiles?.get(r.pubkey)) {
                fetchUserProfileThrottled(r.pubkey);
              }
            });

            const [topEmoji, users] =
              Object.entries(emojiGroups).sort(
                (a, b) => b[1].length - a[1].length
              )[0] || [];

            return (
              <div key={note.id} style={{ marginBottom: "1.5rem" }}>
                {topEmoji && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: "1.2rem" }}>{topEmoji}</span>
                    {users.slice(0, 3).map((pubkey) => {
                      const profile = profiles?.get(pubkey);
                      const displayName =
                        profile?.name ||
                        nip19.npubEncode(pubkey).substring(0, 8) + "...";

                      return (
                        <Tooltip title={displayName} key={pubkey}>
                          <Avatar
                            src={profile?.picture || DEFAULT_IMAGE_URL}
                            alt={displayName}
                            sx={{ width: 24, height: 24 }}
                          />
                        </Tooltip>
                      );
                    })}
                    {users.length > 3 && (
                      <Typography variant="caption">
                        +{users.length - 3} more
                      </Typography>
                    )}
                  </div>
                )}
                <Notes event={note} />
              </div>
            );
          })}

      <div style={{ textAlign: "center", margin: 20 }}>
        <Button
          onClick={!!user ? handleLoadMore : requestLogin}
          variant="contained"
          disabled={loadingMore}
        >
          {loadingMore ? (
            <CircularProgress size={24} />
          ) : !!user ? (
            "Load More"
          ) : (
            "login"
          )}
        </Button>
      </div>
      <RateEventModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default NotesFeed;
