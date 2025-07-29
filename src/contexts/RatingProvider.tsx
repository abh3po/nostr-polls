import React, { createContext, useEffect, useRef, useState } from "react";
import { Event } from "nostr-tools";
import { useRelays } from "../hooks/useRelays";
import { useUserContext } from "../hooks/useUserContext";
import { pool } from "../singletons";

type RatingMap = Map<string, Map<string, number>>; // entityId -> pubkey -> rating
type UserRatingMap = Map<string, Event>; // entityId -> Event

interface RatingContextType {
  registerEntityId: (id: string) => void;
  getAverageRating: (id: string) => { avg: number; count: number } | null;
  getUserRating: (id: string) => number | null;
  ratings: RatingMap;
  userRatingEvents: UserRatingMap;
}

export const RatingContext = createContext<RatingContextType>({
  registerEntityId: () => null,
  getAverageRating: () => ({ avg: -1, count: -1 }),
  getUserRating: () => null,
  ratings: new Map(),
  userRatingEvents: new Map(),
});

export const RatingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ratings, setRatings] = useState<RatingMap>(new Map());
  const [userRatingEvents, setUserRatingEvents] = useState<UserRatingMap>(new Map());
  const trackedIdsRef = useRef<Set<string>>(new Set());
  const lastTrackedIds = useRef<string[]>([]);
  const subscriptionRef = useRef<ReturnType<typeof pool.subscribeMany> | null>(null);

  const { user } = useUserContext();
  const { relays } = useRelays();

  const registerEntityId = (id: string) => {
    trackedIdsRef.current.add(id);
  };

  const getAverageRating = (entityId: string) => {
    const entityRatings = ratings.get(entityId);
    if (!entityRatings) return null;

    const values = Array.from(entityRatings.values());
    const avg = values.reduce((sum, r) => sum + r, 0) / values.length;
    return { avg, count: values.length };
  };

  const getUserRating = (entityId: string): number | null => {
    const event = userRatingEvents.get(entityId);
    const ratingTag = event?.tags.find((t) => t[0] === "rating")?.[1];
    const value = ratingTag ? parseFloat(ratingTag) : NaN;
    return !isNaN(value) ? value : null;
  };

  const handleEvent = (ev: Event) => {
    const dTag = ev.tags.find((t) => t[0] === "d")?.[1];
    const ratingTag = ev.tags.find((t) => t[0] === "rating")?.[1];
    const pubkey = ev.pubkey;

    if (!dTag || !ratingTag || !pubkey) return;

    const value = parseFloat(ratingTag);
    if (isNaN(value) || value < 0 || value > 1) return;

    // Update global ratings
    setRatings((prev) => {
      const next = new Map(prev);
      const entityMap = new Map(next.get(dTag) || []);
      entityMap.set(pubkey, value);
      next.set(dTag, entityMap);
      return next;
    });

    // Update user-specific ratings
    if (user && user.pubkey === pubkey) {
      setUserRatingEvents((prev) => {
        const existing = prev.get(dTag);
        if (!existing || existing.created_at < ev.created_at) {
          const updated = new Map(prev);
          updated.set(dTag, ev);
          return updated;
        }
        return prev;
      });
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const ids = Array.from(trackedIdsRef.current);
      const hasChanged =
        ids.length !== lastTrackedIds.current.length ||
        ids.some((id, i) => id !== lastTrackedIds.current[i]);
      if (!hasChanged) return;

      lastTrackedIds.current = ids;

      if (subscriptionRef.current) {
        subscriptionRef.current.close();
      }

      if (ids.length === 0) return;

      const filters = [
        {
          kinds: [34259],
          "#d": ids,
        },
      ];

      subscriptionRef.current = pool.subscribeMany(relays, filters, {
        onevent: handleEvent,
      });
    }, 3000);

    return () => {
      clearInterval(interval);
      if (subscriptionRef.current) subscriptionRef.current.close();
    };
  }, [user]);

  return (
    <RatingContext.Provider
      value={{
        registerEntityId,
        getAverageRating,
        getUserRating,
        ratings,
        userRatingEvents,
      }}
    >
      {children}
    </RatingContext.Provider>
  );
};
