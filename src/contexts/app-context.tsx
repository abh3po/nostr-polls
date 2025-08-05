import { ReactNode, createContext, useRef, useState } from "react";
import { Event } from "nostr-tools/lib/types/core";
import { Profile } from "../nostr/types";
import { Throttler } from "../nostr/requestThrottler";
import { pool } from "../singletons";

type AppContextInterface = {
  profiles: Map<string, Profile> | undefined;
  commentsMap: Map<string, Event[]> | undefined;
  likesMap: Map<string, Event[]> | undefined;
  zapsMap: Map<string, Event[]> | undefined;
  repostsMap: Map<string, Event[]> | undefined;
  addEventToProfiles: (event: Event) => void;
  addEventToMap: (event: Event) => void;
  fetchUserProfileThrottled: (pubkey: string) => void;
  fetchCommentsThrottled: (pollEventId: string) => void;
  fetchLikesThrottled: (pollEventId: string) => void;
  fetchZapsThrottled: (pollEventId: string) => void;
  fetchRepostsThrottled: (pollEventId: string) => void;
  aiSettings: {
    model: string;
  };
  setAISettings: (settings: { model: string }) => void;
};

export const AppContext = createContext<AppContextInterface | null>(null);

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [commentsMap, setCommentsMap] = useState<Map<string, Event[]>>(new Map());
  const [likesMap, setLikesMap] = useState<Map<string, Event[]>>(new Map());
  const [zapsMap, setZapsMap] = useState<Map<string, Event[]>>(new Map());
  const [repostsMap, setRepostsMap] = useState<Map<string, Event[]>>(new Map());

  const [aiSettings, setAISettings] = useState(
    JSON.parse(localStorage.getItem("ai-settings") || "{}")
  );

  const addEventToProfiles = (event: Event) => {
    if (profiles.has(event.pubkey)) return;
    try {
      let content = JSON.parse(event.content);
      setProfiles(
        new Map(profiles.set(event.pubkey, { ...content, event: event }))
      );
    } catch (e) {
      console.error("Error parsing event", e);
    }
  };

  const addEventsToProfiles = (events: Event[]) => {
    events.forEach((event: Event) => {
      addEventToProfiles(event);
    });
  };

  const addEventToMap = (event: Event) => {
    let map: Map<string, Event[]>;
    let setter: React.Dispatch<React.SetStateAction<Map<string, Event[]>>>;
    let kind = event.kind;

    if ([1, 6, 7, 16, 9735].includes(kind)) {
      if (kind === 1) {
        map = commentsMap;
        setter = setCommentsMap;
      } else if (kind === 7) {
        map = likesMap;
        setter = setLikesMap;
      } else if (kind === 9735) {
        map = zapsMap;
        setter = setZapsMap;
      } else if (kind === 6 || kind === 16) {
        map = repostsMap;
        setter = setRepostsMap;
      } else {
        return;
      }

      const eTag = event.tags.find((tag) => tag[0] === "e");
      if (!eTag) return;
      const targetId = eTag[1];

      if (
        !map.get(targetId)?.some((e) => e.id === event.id)
      ) {
        setter(
          (prev: Map<string, Event[]>) =>
            new Map(prev.set(targetId, [...(prev.get(targetId) || []), event]))
        );
      }
    }
  };

  const addEventsToMap = (events: Event[]) => {
    events.forEach((event: Event) => {
      addEventToMap(event);
    });
  };

  const ProfileThrottler = useRef(
    new Throttler(50, pool, addEventsToProfiles, "profiles", 500)
  );
  const CommentsThrottler = useRef(
    new Throttler(50, pool, addEventsToMap, "comments", 1000)
  );
  const LikesThrottler = useRef(
    new Throttler(50, pool, addEventsToMap, "likes", 1500)
  );
  const ZapsThrottler = useRef(
    new Throttler(50, pool, addEventsToMap, "zaps", 2000)
  );
  const RepostsThrottler = useRef(
    new Throttler(50, pool, addEventsToMap, "reposts", 2500)
  );

  const fetchUserProfileThrottled = (pubkey: string) => {
    ProfileThrottler.current.addId(pubkey);
  };

  const fetchCommentsThrottled = (pollEventId: string) => {
    CommentsThrottler.current.addId(pollEventId);
  };

  const fetchLikesThrottled = (pollEventId: string) => {
    LikesThrottler.current.addId(pollEventId);
  };

  const fetchZapsThrottled = (pollEventId: string) => {
    ZapsThrottler.current.addId(pollEventId);
  };

  const fetchRepostsThrottled = (pollEventId: string) => {
    RepostsThrottler.current.addId(pollEventId);
  };

  return (
    <AppContext.Provider
      value={{
        profiles,
        commentsMap,
        likesMap,
        zapsMap,
        repostsMap,
        addEventToProfiles,
        addEventToMap,
        fetchUserProfileThrottled,
        fetchCommentsThrottled,
        fetchLikesThrottled,
        fetchZapsThrottled,
        fetchRepostsThrottled,
        aiSettings,
        setAISettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
