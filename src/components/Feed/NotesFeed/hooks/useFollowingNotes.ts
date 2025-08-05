import { useState, useRef } from "react";
import { Event, Filter } from "nostr-tools";
import { useRelays } from "../../../../hooks/useRelays";
import { pool } from "../../../../singletons";
import { useUserContext } from "../../../../hooks/useUserContext";

export const useFollowingNotes = () => {
  const [notes, setNotes] = useState<Map<string, Event>>(new Map());
  const [reposts, setReposts] = useState<Map<string, Event[]>>(new Map());
  const [loadingMore, setLoadingMore] = useState(false);
  const missingNotesRef = useRef<Set<string>>(new Set());

  const { relays } = useRelays();
  const { user } = useUserContext();

  const fetchNotes = async () => {
    if (!user?.follows?.length || loadingMore) return;

    setLoadingMore(true);
    const authors = Array.from(user.follows);

    const noteFilter: Filter = {
      kinds: [1],
      authors,
      limit: 10,
    };

    if (notes.size > 0) {
      noteFilter.until = Array.from(notes.values()).sort(
        (a, b) => a.created_at - b.created_at
      )[0].created_at;
    }

    const repostFilter: Filter = {
      kinds: [6],
      authors,
      limit: 10,
    };

    if (reposts.size > 0) {
      const oldestRepostTime = Math.min(
        ...Array.from(reposts.values()).flat().map((r) => r.created_at)
      );
      repostFilter.until = oldestRepostTime;
    }

    const sub = pool.subscribeMany(relays, [noteFilter, repostFilter], {
      onevent: (event: Event) => {
        if (event.kind === 1) {
          setNotes((prev) => {
            const updated = new Map(prev);
            const existing = updated.get(event.id);
            if (!existing || existing.created_at < event.created_at) {
              updated.set(event.id, event);
            }
            return updated;
          });
        }

        if (event.kind === 6) {
          const originalNoteId = event.tags.find((t) => t[0] === "e")?.[1];
          if (originalNoteId) {
            missingNotesRef.current.add(originalNoteId);

            setReposts((prev) => {
              const updated = new Map(prev);
              const existing = updated.get(originalNoteId) || [];
              if (!existing.find((e) => e.id === event.id)) {
                updated.set(originalNoteId, [...existing, event]);
              }
              return updated;
            });
          }
        }
      },
      oneose: () => {
        sub.close();
        startMissingNotesFetcher();
        setLoadingMore(false);
      },
    });
  };

  const fetchNewerNotes = async () => {
    if (!user?.follows?.length) return;

    setLoadingMore(true);
    const authors = Array.from(user.follows);

    const noteFilter: Filter = {
      kinds: [1],
      authors,
    };

    if (notes.size > 0) {
      const latest = Array.from(notes.values()).sort(
        (a, b) => b.created_at - a.created_at
      )[0];
      noteFilter.since = latest.created_at + 1;
    }

    const repostFilter: Filter = {
      kinds: [6],
      authors,
    };

    if (reposts.size > 0) {
      const latestRepost = Array.from(reposts.values())
        .flat()
        .sort((a, b) => b.created_at - a.created_at)[0];
      repostFilter.since = latestRepost.created_at + 1;
    }

    const sub = pool.subscribeMany(relays, [noteFilter, repostFilter], {
      onevent: (event: Event) => {
        if (event.kind === 1) {
          setNotes((prev) => {
            const updated = new Map(prev);
            const existing = updated.get(event.id);
            if (!existing || existing.created_at < event.created_at) {
              updated.set(event.id, event);
            }
            return updated;
          });
        }

        if (event.kind === 6) {
          const originalNoteId = event.tags.find((t) => t[0] === "e")?.[1];
          if (originalNoteId) {
            missingNotesRef.current.add(originalNoteId);

            setReposts((prev) => {
              const updated = new Map(prev);
              const existing = updated.get(originalNoteId) || [];
              if (!existing.find((e) => e.id === event.id)) {
                updated.set(originalNoteId, [...existing, event]);
              }
              return updated;
            });
          }
        }
      },
      oneose: () => {
        sub.close();
        startMissingNotesFetcher();
        setLoadingMore(false);
      },
    });
  };

  const startMissingNotesFetcher = () => {
    const idsToFetch = Array.from(missingNotesRef.current);
    if (idsToFetch.length === 0) return;

    const fetchedIds = new Set<string>();

    const sub = pool.subscribeMany(relays, [{
      kinds: [1],
      ids: idsToFetch,
    }], {
      onevent: (event: Event) => {
        setNotes((prev) => {
          const updated = new Map(prev);
          updated.set(event.id, event);
          return updated;
        });
        fetchedIds.add(event.id);
      },
    });

    const interval = setInterval(() => {
      const stillMissing = idsToFetch.filter((id) => !fetchedIds.has(id));
      if (stillMissing.length === 0) {
        clearInterval(interval);
        sub.close();
        missingNotesRef.current.clear();
        return;
      }

      pool.subscribeMany(relays, [{
        kinds: [1],
        ids: stillMissing,
      }], {
        onevent: (event: Event) => {
          setNotes((prev) => {
            const updated = new Map(prev);
            updated.set(event.id, event);
            return updated;
          });
          fetchedIds.add(event.id);
        },
      });

    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      sub.close();
      missingNotesRef.current.clear();
    }, 5000);
  };

  return {
    notes,
    reposts,
    fetchNotes,
    fetchNewerNotes,
    loadingMore,
  };
};
