import { useState, useCallback } from "react";
import { Event, Filter } from "nostr-tools";
import { useRelays } from "../../../../hooks/useRelays";
import { nostrRuntime } from "../../../../singletons";

export const useReactedNotes = (user: any) => {
  const [loading, setLoading] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState<number | undefined>(undefined);
  const [version, setVersion] = useState(0);
  const { relays } = useRelays();

  // Query runtime for reactions and reacted notes
  const reactionEvents = useCallback(() => {
    if (!user?.follows?.length) return new Map<string, Event>();

    const events = nostrRuntime.query({
      kinds: [7],
      authors: user.follows,
    });

    const reactionMap = new Map<string, Event>();
    for (const event of events) {
      reactionMap.set(event.id, event);
    }
    return reactionMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.follows, version]);

  const reactedEvents = useCallback(() => {
    if (!user?.follows?.length) return new Map<string, Event>();

    // Get all reactions
    const reactions = Array.from(reactionEvents().values());

    // Extract reacted note IDs
    const reactedNoteIds = reactions
      .map((e) => e.tags.find((tag) => tag[0] === "e")?.[1])
      .filter(Boolean) as string[];

    // Query for those notes
    const noteEvents = nostrRuntime.query({
      kinds: [1],
      ids: reactedNoteIds,
    });

    const noteMap = new Map<string, Event>();
    for (const event of noteEvents) {
      noteMap.set(event.id, event);
    }
    return noteMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.follows, version, reactionEvents]);

  const fetchReactedNotes = async () => {
    if (!user?.follows?.length || loading) return;
    setLoading(true);

    // Step 1: Fetch reactions
    const reactionFilter: Filter = {
      kinds: [7],
      authors: user.follows,
      limit: 20,
    };
    if (lastTimestamp) {
      reactionFilter.until = lastTimestamp;
    }

    let newReactionEvents: Event[] = [];
    let reactedNoteIds: string[] = [];

    const reactionHandle = nostrRuntime.subscribe(relays, [reactionFilter], {
      onEvent: (event) => {
        newReactionEvents.push(event);
        const noteId = event.tags.find((tag) => tag[0] === "e")?.[1];
        if (noteId) {
          reactedNoteIds.push(noteId);
        }
      },
      onEose: () => {
        reactionHandle.unsubscribe();

        // Step 2: Fetch the original notes
        if (reactedNoteIds.length > 0) {
          const uniqueNoteIds = Array.from(new Set(reactedNoteIds));
          const noteFilter: Filter = {
            kinds: [1],
            ids: uniqueNoteIds,
          };

          const noteHandle = nostrRuntime.subscribe(relays, [noteFilter], {
            onEvent: () => {
              // Events automatically stored in runtime
            },
            onEose: () => {
              noteHandle.unsubscribe();
              finishFetch();
            },
          });
        } else {
          finishFetch();
        }
      },
    });

    const finishFetch = () => {
      if (newReactionEvents.length > 0) {
        const oldest = newReactionEvents.reduce((min, e) =>
          e.created_at < min.created_at ? e : min
        );
        setLastTimestamp(oldest.created_at);
      }

      setVersion((v) => v + 1);
      setLoading(false);
    };
  };

  return {
    reactedEvents: reactedEvents(),
    reactionEvents: reactionEvents(),
    fetchReactedNotes,
    loading,
  };
};
