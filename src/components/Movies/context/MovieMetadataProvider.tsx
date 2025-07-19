// context/MovieMetadataProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Event, Filter, SimplePool } from "nostr-tools";
import { useRelays } from "../../../hooks/useRelays";

type MetadataMap = Map<string, Event[]>;

interface MovieMetadataContextType {
  metadata: MetadataMap;
  registerMovie: (id: string) => void;
}

const MovieMetadataContext = createContext<MovieMetadataContextType>({
  metadata: new Map(),
  registerMovie: () => {},
});

export const useMovieMetadata = () => useContext(MovieMetadataContext);

export const MovieMetadataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [metadata, setMetadata] = useState<MetadataMap>(new Map());
  const trackedIdsRef = useRef<Set<string>>(new Set());
  const lastTrackedIds = useRef<string[]>([]);
  const subRef = useRef<ReturnType<typeof pool.subscribeMany> | null>(null);
  const pool = useRef(new SimplePool()).current;
  const { relays } = useRelays();

  const registerMovie = (id: string) => {
    trackedIdsRef.current.add(id);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const ids = Array.from(trackedIdsRef.current);
      const prevSet = new Set(lastTrackedIds.current);
      const currSet = new Set(ids);
      const hasChanged =
        prevSet.size !== currSet.size ||
        Array.from(currSet).some((id) => !prevSet.has(id));

      if (!hasChanged) return;
      lastTrackedIds.current = Array.from(currSet);
      if (subRef.current) subRef.current.close();
      if (ids.length === 0) return;

      const filters: Filter[] = [
        {
          kinds: [30300],
          "#d": ids.map((id) => `movie:${id}`),
        },
      ];

      subRef.current = pool.subscribeMany(relays, filters, {
        onevent: (event) => {
          const dTag = event.tags.find((t) => t[0] === "d")?.[1];
          if (!dTag?.startsWith("movie:")) return;
          const imdbId = dTag.split(":")[1];

          setMetadata((prev) => {
            const next = new Map(prev);
            const existing = next.get(imdbId) || [];
            if (existing.some((e) => e.id === event.id)) return next;
            next.set(imdbId, [...existing, event]);
            return next;
          });
        },
      });
    }, 3000);

    return () => {
      clearInterval(interval);
      if (subRef.current) subRef.current.close();
    };
  }, []);

  return (
    <MovieMetadataContext.Provider value={{ metadata, registerMovie }}>
      {children}
    </MovieMetadataContext.Provider>
  );
};
