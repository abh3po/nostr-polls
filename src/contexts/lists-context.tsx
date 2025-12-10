import { ReactNode, createContext, useEffect, useRef, useState } from "react";
import { Event, Filter } from "nostr-tools";
import { SubCloser } from "nostr-tools/lib/types/pool";
import { parseContacts, getATagFromEvent } from "../nostr";
import { useRelays } from "../hooks/useRelays";
import { useUserContext } from "../hooks/useUserContext";
import { User } from "./user-context";
import { pool } from "../singletons";

const WOT_STORAGE_KEY_PREFIX = `pollerama:webOfTrust`;
const WOT_TTL = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds

interface ListContextInterface {
  lists: Map<string, Event> | undefined;
  selectedList: string | undefined;
  handleListSelected: (id: string | null) => void;
  fetchLatestContactList(): Promise<Event | null>;
}

export const ListContext = createContext<ListContextInterface | null>(null);

export function ListProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<Map<string, Event> | undefined>();
  const [selectedList, setSelectedList] = useState<string | undefined>();
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
      let resolved = false;
      const closer = pool.subscribeMany(relays, [filter], {
        onevent(event: Event) {
          if (!resolved) {
            resolved = true;
            resolve(event);
            closer.close();
          }
        },
        onclose() {
          if (!resolved) {
            resolve(null);
          }
        },
      });
      setTimeout(() => {
        if (!resolved) {
          closer.close();
          resolve(null);
        }
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

  const handleContactListEvent = async (event: Event, closer: SubCloser) => {
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
    if (!user) return;
    let contactListFilter = {
      kinds: [3],
      limit: 5,
      authors: [user!.pubkey],
    };
    let closer = pool.subscribeMany(relays, [contactListFilter], {
      onevent: (event: Event) => {
        handleContactListEvent(event, closer);
      },
    });
  };

  const fetchLists = () => {
    let followSetFilter = {
      kinds: [30000],
      limit: 100,
      authors: [user!.pubkey],
    };
    let closer = pool.subscribeMany(relays, [followSetFilter], {
      onevent: handleListEvent,
    });
    return closer;
  };

  const subscribeToContacts = () => {
    if (!user || !user.follows?.length) return;

    const storedWoT = localStorage.getItem(
      `${WOT_STORAGE_KEY_PREFIX}${user.pubkey}`
    );
    const storedTime = localStorage.getItem(
      `${WOT_STORAGE_KEY_PREFIX}${user.pubkey}_time`
    );
    const currentTime = new Date().getTime();

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

    const sub = pool.subscribeMany(relays, [filter], {
      onevent: (event: Event) => {
        const newPubkeys = event.tags
          .filter((tag) => tag[0] === "p" && tag[1])
          .map((tag) => tag[1]);

        setUser((prev) => {
          if (!prev) return null; // Return null if prev is null

          const prevTrust = prev.webOfTrust ?? new Set<string>();
          const newSet = new Set([...Array.from(prevTrust), ...newPubkeys]);

          // Ensure all required properties are included in the returned User object
          localStorage.setItem(
            `${WOT_STORAGE_KEY_PREFIX}${user.pubkey}`,
            JSON.stringify(Array.from(newSet))
          );
          const currentTime = new Date().getTime();
          localStorage.setItem(
            `${WOT_STORAGE_KEY_PREFIX}${user.pubkey}_time`,
            currentTime.toString()
          );
          return {
            ...prev,
            webOfTrust: newSet,
          } as User; // Ensure the returned object is cast to User
        });
      },
      oneose() {
        sub.close();
        setIsFetchingWoT(false); // Hide warning after fetching
      },
    });

    return sub;
  };

  useEffect(() => {
    if (!user) return;
    if (!pool) return;
    if (user) {
      if (!lists) fetchLists();
      if (!user.follows || user.follows.length === 0) fetchContacts();
      if (!user.webOfTrust || user.webOfTrust.size === 0) subscribeToContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists, user]);
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
        }}
      >
        {children}
      </ListContext.Provider>
    </>
  );
}
