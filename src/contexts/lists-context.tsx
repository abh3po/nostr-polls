import { ReactNode, createContext, useEffect, useState } from "react";
import { useAppContext } from "../hooks/useAppContext";
import { Event } from "nostr-tools";
import { SubCloser } from "nostr-tools/lib/types/pool";
import { defaultRelays, parseContacts, getATagFromEvent } from "../nostr";
import { useUserContext } from "../hooks/useUserContext";
import { User } from "./user-context";

interface ListContextInterface {
  lists: Map<string, Event> | undefined;
  selectedList: string | undefined;
  handleListSelected: (id: string | null) => void;
}

export const ListContext = createContext<ListContextInterface | null>(null);

export function ListProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<Map<string, Event> | undefined>();
  const [selectedList, setSelectedList] = useState<string | undefined>();
  const { poolRef } = useAppContext();
  const { user, setUser } = useUserContext();

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
    let closer = poolRef.current?.subscribeMany(
      defaultRelays,
      [contactListFilter],
      {
        onevent: (event: Event) => {
          handleContactListEvent(event, closer);
        },
      }
    );
  };

  const fetchLists = () => {
    let followSetFilter = {
      kinds: [30000],
      limit: 100,
      authors: [user!.pubkey],
    };
    let closer = poolRef.current?.subscribeMany(
      defaultRelays,
      [followSetFilter],
      {
        onevent: handleListEvent,
      }
    );
    return closer;
  };

  useEffect(() => {
    if (!user) return;
    if (!poolRef.current) return;
    if (user && poolRef && !lists) {
      fetchLists();
      fetchContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists, poolRef, user]);
  return (
    <ListContext.Provider value={{ lists, selectedList, handleListSelected }}>
      {children}
    </ListContext.Provider>
  );
}
