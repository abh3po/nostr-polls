import React, { useEffect, useState } from "react";
import { Event, Filter, SimplePool } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import { Notes } from "../Notes";
import { useUserContext } from "../../hooks/useUserContext";
import { Button, CircularProgress, Typography } from "@mui/material";
import RateEventCard from "../Ratings/RateEventCard";
import RateEventModal from "../Ratings/RateEventModal";
import { useSigner } from "../../contexts/signer-context";

const NOTES_BATCH_SIZE = 10;

const NotesFeed: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"following" | "reacted">(
    "following"
  );
  const [reactedEvents, setReactedEvents] = useState<Map<string, Event>>(
    new Map()
  );
  const [events, setEvents] = useState<Map<string, Event>>(new Map());
  const [loadingMore, setLoadingMore] = useState(false);
  const { user } = useUserContext();
  const { requestLogin } = useSigner();
  const [modalOpen, setModalOpen] = useState(false);

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

    const reactionEvents = await pool.querySync(defaultRelays, reactionFilter);

    const reactedNoteIds = reactionEvents
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

      {(activeTab === "following"
        ? sortedEvents
        : Array.from(reactedEvents.values()).sort(
            (a, b) => b.created_at - a.created_at
          )
      ).map((e) => {
        const reactedByContacts = Array.from(reactedEvents.values())
          .filter((r) => {
            const taggedNoteId = r.tags.find((tag) => tag[0] === "e")?.[1];
            return taggedNoteId === e.id;
          })
          .map((r) => user!.follows!.find((id) => id === r.pubkey)) // match pubkey to contact
          .filter(Boolean);

        return (
          <div key={e.id} style={{ marginBottom: "1.5rem" }}>
            {activeTab === "reacted" && reactedByContacts.length > 0 && (
              <Typography
                variant="caption"
                style={{ marginBottom: "0.3rem", display: "block" }}
              >
                👍 Reacted by: {reactedByContacts.slice(0, 2).join(", ")}
                {reactedByContacts.length > 2
                  ? `, +${reactedByContacts.length - 2} more`
                  : ""}
              </Typography>
            )}
            <Notes event={e} />
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
