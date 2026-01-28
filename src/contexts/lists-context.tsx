import { ReactNode, createContext, useEffect, useState } from "react";
import { Event, EventTemplate, Filter } from "nostr-tools";
import { parseContacts, getATagFromEvent } from "../nostr";
import { useRelays } from "../hooks/useRelays";
import { useUserContext } from "../hooks/useUserContext";
import { User } from "./user-context";
import { pool, nostrRuntime } from "../singletons";
import { signerManager } from "../singletons/Signer/SignerManager";

const WOT_STORAGE_KEY_PREFIX = `pollerama:webOfTrust`;
const WOT_TTL = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds

interface ListContextInterface {
  lists: Map<string, Event> | undefined;
  selectedList: string | undefined;
  handleListSelected: (id: string | null) => void;
  fetchLatestContactList(): Promise<Event | null>;
  myTopics: Set<string> | undefined;
  addTopicToMyTopics: (topic: string) => Promise<void>;
  removeTopicFromMyTopics: (topic: string) => Promise<void>;
}

export const ListContext = createContext<ListContextInterface | null>(null);

export function ListProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<Map<string, Event> | undefined>();
  const [selectedList, setSelectedList] = useState<string | undefined>();
  const [myTopics, setMyTopics] = useState<Set<string> | undefined>();
  const [myTopicsEvent, setMyTopicsEvent] = useState<
    Event | null | undefined
  >();
  const { user, setUser, requestLogin } = useUserContext();
  const { relays } = useRelays();
  const [isFetchingWoT, setIsFetchingWoT] = useState(false);

  const fetchLatestContactList = (): Promise<Event | null> => {
    if (!user) {
      requestLogin();
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      let filter = {
        kinds: [3],
        authors: [user.pubkey],
        limit: 1,
      };
      let latestEvent: Event | null = null;
      const handle = nostrRuntime.subscribe(relays, [filter], {
        onEvent(event: Event) {
          // Keep track of the most recent event
          if (!latestEvent || event.created_at > latestEvent.created_at) {
            latestEvent = event;
          }
        },
      });
      setTimeout(() => {
        handle.unsubscribe();
        resolve(latestEvent);
      }, 2000);
    });
  };

  const handleListEvent = (event: Event) => {
    setLists((prevMap) => {
      let a_tag = getATagFromEvent(event);
      const newMap = new Map(prevMap);
      newMap.set(a_tag, event);
      return newMap;
    });
  };

  const handleListSelected = (id: string | null) => {
    if (!id) {
      setSelectedList(undefined);
      return;
    }
    if (!lists?.has(id)) throw Error("List not found");
    setSelectedList(id);
  };

  const handleContactListEvent = async (event: Event) => {
    const follows = await parseContacts(event);
    let a_tag = `${event.kind}:${event.pubkey}`;
    let pastEvent = lists?.get(a_tag);
    if (event.created_at > (pastEvent?.created_at || 0)) {
      setUser({
        ...user,
        follows: Array.from(follows),
      } as User);
      setLists((prevMap) => {
        const newMap = new Map(prevMap);
        newMap.set(a_tag, event);
        return newMap;
      });
    }
  };

  const fetchContacts = () => {
    if (!user || !user.pubkey) return;
    let contactListFilter = {
      kinds: [3],
      authors: [user.pubkey],
    };
    nostrRuntime.subscribe(relays, [contactListFilter], {
      onEvent: (event: Event) => {
        handleContactListEvent(event);
      },
    });
  };

  const fetchLists = () => {
    let followSetFilter = {
      kinds: [30000],
      limit: 100,
      authors: [user!.pubkey],
    };
    nostrRuntime.subscribe(relays, [followSetFilter], {
      onEvent: handleListEvent,
    });
  };

  const subscribeToContacts = () => {
    if (!user || !user.follows?.length) return;

    const storedWoT = localStorage.getItem(
      `${WOT_STORAGE_KEY_PREFIX}${user.pubkey}`,
    );
    const storedTime = localStorage.getItem(
      `${WOT_STORAGE_KEY_PREFIX}${user.pubkey}_time`,
    );
    const currentTime = new Date().getTime();

    // Use cached WoT if within TTL (5 days)
    if (storedWoT && storedTime && currentTime - Number(storedTime) < WOT_TTL) {
      setUser((prev: User | null) => {
        if (!prev) return null;
        return {
          ...prev,
          webOfTrust: new Set(JSON.parse(storedWoT) || []),
        };
      });
      return;
    }

    setIsFetchingWoT(true); // Show warning that WoT is being fetched

    const filter: Filter = {
      kinds: [3],
      authors: user.follows,
      limit: 500,
    };

    const handle = nostrRuntime.subscribe(relays, [filter], {
      onEvent: (event: Event) => {
        const newPubkeys = event.tags
          .filter((tag) => tag[0] === "p" && tag[1])
          .map((tag) => tag[1]);

        setUser((prev) => {
          if (!prev) return null;

          const prevTrust = prev.webOfTrust ?? new Set<string>();
          const newSet = new Set([...Array.from(prevTrust), ...newPubkeys]);

          // Store in localStorage with 5-day TTL
          localStorage.setItem(
            `${WOT_STORAGE_KEY_PREFIX}${user.pubkey}`,
            JSON.stringify(Array.from(newSet)),
          );
          const currentTime = new Date().getTime();
          localStorage.setItem(
            `${WOT_STORAGE_KEY_PREFIX}${user.pubkey}_time`,
            currentTime.toString(),
          );
          return {
            ...prev,
            webOfTrust: newSet,
          } as User;
        });
      },
      onEose() {
        handle.unsubscribe();
        setIsFetchingWoT(false); // Hide warning after fetching
      },
    });

    return handle;
  };

  const fetchMyTopics = async () => {
    if (!user) return;

    const signer = signerManager.getSigner().catch(() => null);
    if (!signer) return;

    const filter: Filter = {
      kinds: [10015],
      authors: [user.pubkey],
      limit: 1,
    };

    return new Promise<void>((resolve) => {
      const handle = nostrRuntime.subscribe(relays, [filter], {
        onEvent: async (event: Event) => {
          if (myTopicsEvent && event.created_at <= myTopicsEvent.created_at)
            return;
          setMyTopicsEvent(event);
          processMyTopicsFromEvent(event);
        },
        onEose: () => {
          handle.unsubscribe();
          resolve();
        },
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        handle.unsubscribe();
        if (!myTopicsEvent) {
          setMyTopicsEvent(null);
        }
        resolve();
      }, 10000);
    });
  };

  const processMyTopicsFromEvent = async (event: Event) => {
    const topics = new Set<string>();

    // Parse "t" tags from the event
    event.tags.forEach((tag) => {
      if (tag[0] === "t" && tag[1]) {
        topics.add(tag[1]);
      }
    });
    // Decrypt and parse content if available
    if (event.content) {
      try {
        const signer = await signerManager.getSigner();
        if (!signer) return;
        const decrypted = await signer.nip44Decrypt!(
          user!.pubkey,
          event.content,
        );
        const contentTags = JSON.parse(decrypted);
        if (Array.isArray(contentTags)) {
          contentTags.forEach((tag: any) => {
            if (Array.isArray(tag) && tag[0] === "t" && tag[1]) {
              topics.add(tag[1]);
            }
          });
        }
      } catch (e) {
        console.error("Failed to decrypt topics content:", e);
      }
    }

    setMyTopics(topics);
  };

  useEffect(() => {
    if (!user) return;
    if (!pool) return;
    if (user) {
      if (!lists) fetchLists();
      if (!user.follows || user.follows.length === 0) fetchContacts();
      if (!user.webOfTrust || user.webOfTrust.size === 0) subscribeToContacts();
      if (!myTopics) fetchMyTopics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists, myTopics, user]);

  const addTopicToMyTopics = async (topic: string): Promise<void> => {
    const signer = await signerManager.getSigner();
    if (!signer) throw Error("No signer available");

    const pubkey = await signer.getPublicKey();

    // Fetch existing kind 10015 event
    const filter = {
      kinds: [10015],
      authors: [pubkey],
      limit: 1,
    };

    let existingEvent: Event | null = null;

    return new Promise((resolve, reject) => {
      const handle = nostrRuntime.subscribe(relays, [filter], {
        onEvent: (event) => {
          existingEvent = event;
        },
        onEose: async () => {
          handle.unsubscribe();
          try {
            const tags = existingEvent?.tags ?? [];

            // Check if topic already exists
            const topicExists = tags.some(
              (tag) => tag[0] === "t" && tag[1] === topic,
            );
            if (topicExists) {
              resolve();
              return;
            }

            // Add the new topic tag
            const newTags = [...tags, ["t", topic]];

            const eventTemplate: EventTemplate = {
              kind: 10015,
              created_at: Math.floor(Date.now() / 1000),
              tags: newTags,
              content: existingEvent?.content ?? "",
            };

            const signed = await signer.signEvent(eventTemplate);
            await Promise.allSettled(pool.publish(relays, signed));
            processMyTopicsFromEvent(signed);
            fetchMyTopics();
            resolve();
          } catch (error) {
            reject(error);
          }
        },
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        handle.unsubscribe();
        if (!existingEvent) {
          // Create new event if none exists
          handleNewEvent();
        }
      }, 5000);

      async function handleNewEvent() {
        try {
          const eventTemplate: EventTemplate = {
            kind: 10015,
            created_at: Math.floor(Date.now() / 1000),
            tags: [["t", topic]],
            content: "",
          };

          const signed = await signer.signEvent(eventTemplate);
          await Promise.allSettled(pool.publish(relays, signed));
          processMyTopicsFromEvent(signed);
          fetchMyTopics();
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    });
  };
  const removeTopicFromMyTopics = async (topic: string): Promise<void> => {
    const signer = await signerManager.getSigner();
    if (!signer) throw Error("No signer available");

    const pubkey = await signer.getPublicKey();

    const filter: Filter = {
      kinds: [10015],
      authors: [pubkey],
      limit: 1,
    };

    let existingEvent: Event | null = null;

    return new Promise((resolve, reject) => {
      const handle = nostrRuntime.subscribe(relays, [filter], {
        onEvent: (event) => {
          existingEvent = event;
        },
        onEose: async () => {
          handle.unsubscribe();
          try {
            const oldTags = existingEvent?.tags ?? [];

            // Filter out the topic tag
            const newTags = oldTags.filter(
              (tag) => !(tag[0] === "t" && tag[1] === topic),
            );

            // If nothing changed, exit
            if (newTags.length === oldTags.length) {
              resolve();
              return;
            }

            const eventTemplate: EventTemplate = {
              kind: 10015,
              created_at: Math.floor(Date.now() / 1000),
              tags: newTags,
              content: existingEvent?.content ?? "",
            };

            const signed = await signer.signEvent(eventTemplate);
            await Promise.allSettled(pool.publish(relays, signed));

            // Update local state immediately
            processMyTopicsFromEvent(signed);
            fetchMyTopics();

            resolve();
          } catch (error) {
            reject(error);
          }
        },
      });

      setTimeout(() => {
        handle.unsubscribe();
        resolve(); // No existing event → nothing to remove
      }, 5000);
    });
  };

  return (
    <>
      {isFetchingWoT && (
        <div className="warning">
          fetching web of trust... may take a few seconds..
        </div>
      )}
      <ListContext.Provider
        value={{
          lists,
          selectedList,
          handleListSelected,
          fetchLatestContactList,
          myTopics,
          addTopicToMyTopics,
          removeTopicFromMyTopics,
        }}
      >
        {children}
      </ListContext.Provider>
    </>
  );
}
