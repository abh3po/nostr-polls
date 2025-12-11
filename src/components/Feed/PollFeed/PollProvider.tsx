import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Event, Filter } from "nostr-tools";
import { verifyEvent } from "nostr-tools";
import { useUserContext } from "../../../hooks/useUserContext";
import { useRelays } from "../../../hooks/useRelays";
import { pool } from "../../../singletons";

const KIND_POLL = 1068;
const KIND_RESPONSE = [1018, 1070];
const KIND_REPOST = 16;

type PollsContextValue = {
  pollEvents: Event[];
  repostEvents: Event[];
  userResponses: Event[];
  myPolls: Event[];
  eventSource: "global" | "following";
  responses: Map<string, Event[]>;
  fetchPollById: (id: string) => void;
  setEventSource: (src: "global" | "following") => void;
  loadMore: () => void;
};

const PollsContext = createContext<PollsContextValue | undefined>(undefined);

export const PollsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useUserContext();
  const { relays } = useRelays();

  // Refs for large datasets
  const pollEventsRef = useRef<Event[]>([]);
  const repostEventsRef = useRef<Event[]>([]);
  const userResponsesRef = useRef<Event[]>([]);
  const responsesRef = useRef<Map<string, Event[]>>(new Map());
  const myPollsRef = useRef<Event[]>([]);

  // Small counters to trigger updates
  const [version, setVersion] = useState(0);
  const [eventSource, setEventSource] = useState<"global" | "following">(
    "global"
  );

  const updateMyPolls = (events: Event[]) => {
    myPollsRef.current = mergeEvents(myPollsRef.current, events);
    setVersion((v) => v + 1);
  };

  const fetchMyPolls = () => {
    if (!user?.pubkey) return;
    const filter: Filter = {
      kinds: [KIND_POLL],
      authors: [user.pubkey],
      limit: 40,
    };

    return pool.subscribeMany(relays, [filter], {
      onevent: (event) => {
        if (verifyEvent(event)) {
          updateMyPolls([event]);
        }
      },
    });
  };

  // In initial load effect
  useEffect(() => {
    pollEventsRef.current = [];
    repostEventsRef.current = [];
    myPollsRef.current = [];

    const sub = fetchInitialPolls();
    const respSub = fetchUserResponses();
    const myPollsSub = fetchMyPolls();

    return () => {
      sub?.close();
      respSub?.close();
      myPollsSub?.close();
    };
  }, [eventSource]);

  const mergeEvents = (existing: Event[], incoming: Event[]): Event[] => {
    const map = new Map(existing.map((e) => [e.id, e]));
    for (const e of incoming) {
      map.set(e.id, e);
    }
    return Array.from(map.values()).sort((a, b) => b.created_at - a.created_at);
  };

  const updatePolls = (events: Event[]) => {
    pollEventsRef.current = mergeEvents(pollEventsRef.current, events);
    setVersion((v) => v + 1);
  };

  const updateReposts = (events: Event[]) => {
    repostEventsRef.current = mergeEvents(repostEventsRef.current, events);
    setVersion((v) => v + 1);
  };

  const updateUserResponses = (events: Event[]) => {
    userResponsesRef.current = mergeEvents(userResponsesRef.current, events);
    setVersion((v) => v + 1);
  };

  const fetchInitialPolls = () => {
    const filterPolls: Filter = { kinds: [KIND_POLL], limit: 40 };
    const filterReposts: Filter = { kinds: [KIND_REPOST], "#k": ["1068"] };

    if (eventSource === "following" && user?.follows?.length) {
      filterPolls.authors = user.follows;
      filterReposts.authors = user.follows;
    }

    return pool.subscribeMany(relays, [filterPolls, filterReposts], {
      onevent: (event) => {
        if (verifyEvent(event)) {
          event.kind === KIND_REPOST
            ? updateReposts([event])
            : updatePolls([event]);
        }
      },
    });
  };

  const fetchPollById = (id: string) => {
    const pollFilter: Filter = { ids: [id] };
    const responseFilter: Filter = { "#e": [id], kinds: [1070, 1018] };

    pool.subscribeMany(relays, [pollFilter, responseFilter], {
      onevent: (event: Event) => {
        if (event.kind === 1068) {
          pollEventsRef.current.push(event);
          pollEventsRef.current = Array.from(new Set(pollEventsRef.current));
        }

        if (event.kind === 1070 || event.kind === 1018) {
          const existing = responsesRef.current.get(id) || [];
          responsesRef.current.set(id, [...existing, event]);
        }
        setVersion((v) => v + 1);
      },
    });
  };

  const fetchUserResponses = () => {
    if (!user) return;
    const filter: Filter = {
      kinds: KIND_RESPONSE,
      authors: [user.pubkey],
      limit: 40,
    };
    return pool.subscribeMany(relays, [filter], {
      onevent: (event) => {
        if (verifyEvent(event)) updateUserResponses([event]);
      },
    });
  };

  const loadMore = () => {
    if (!pollEventsRef.current.length) return;
    const oldest = Math.min(...pollEventsRef.current.map((e) => e.created_at));

    const filterPoll: Filter = { kinds: [KIND_POLL], until: oldest, limit: 20 };
    const filterReposts: Filter = {
      kinds: [KIND_REPOST],
      until: oldest,
      "#k": ["1068"],
    };

    if (eventSource === "following" && user?.follows?.length) {
      filterPoll.authors = user.follows;
      filterReposts.authors = user.follows;
    }

    pool.subscribeMany(relays, [filterPoll, filterReposts], {
      onevent: (event) => {
        if (verifyEvent(event)) {
          event.kind === KIND_REPOST
            ? updateReposts([event])
            : updatePolls([event]);
        }
      },
    });
  };

  // Initial load
  useEffect(() => {
    pollEventsRef.current = [];
    repostEventsRef.current = [];
    const sub = fetchInitialPolls();
    const respSub = fetchUserResponses();
    return () => {
      sub?.close();
      respSub?.close();
    };
  }, [eventSource]);

  // Poll for new events every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      const since =
        pollEventsRef.current[0]?.created_at || Math.floor(Date.now() / 1000);
      const filterPolls: Filter = { kinds: [KIND_POLL], since: since + 1 };
      const filterReposts: Filter = {
        kinds: [KIND_REPOST],
        since: since + 1,
        "#k": ["1068"],
      };
      if (eventSource === "following" && user?.follows?.length) {
        filterPolls.authors = user.follows;
        filterReposts.authors = user.follows;
      }
      pool.subscribeMany(relays, [filterPolls, filterReposts], {
        onevent: (event) => {
          if (
            verifyEvent(event) &&
            !pollEventsRef.current.find((e) => e.id === event.id)
          ) {
            event.kind === KIND_REPOST
              ? updateReposts([event])
              : updatePolls([event]);
          }
        },
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [eventSource]);

  return (
    <PollsContext.Provider
      value={{
        pollEvents: pollEventsRef.current,
        repostEvents: repostEventsRef.current,
        userResponses: userResponsesRef.current,
        myPolls: myPollsRef.current,
        eventSource,
        responses: responsesRef.current,
        fetchPollById,
        setEventSource,
        loadMore,
      }}
    >
      {children}
    </PollsContext.Provider>
  );
};

export const usePolls = () => {
  const ctx = useContext(PollsContext);
  if (!ctx) throw new Error("usePolls must be used within PollsProvider");
  return ctx;
};
