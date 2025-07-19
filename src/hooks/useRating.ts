// hooks/useRating.ts
import { useContext, useEffect, useRef } from "react";
import { signEvent } from "../nostr";
import { useRelays } from "./useRelays";
import { RatingContext } from "../contexts/RatingProvider";
import { useAppContext } from "./useAppContext";
import { useSigner } from "../contexts/signer-context";

export const useRating = (entityId: string) => {
  const { ratings, registerEntityId, userRatingEvent } = useContext(RatingContext);
  const { poolRef } = useAppContext();
  const hasSubmittedRef = useRef(false);
  const { signer } = useSigner();
  const { relays } = useRelays();

  // Register entityId with the RatingsProvider
  useEffect(() => {
    registerEntityId(entityId);
  }, [entityId, registerEntityId]);

  const submitRating = async (
    newRating: number,
    outOf: number = 5,
    entityType: string = "event",
    content?: string
  ) => {
    if (hasSubmittedRef.current) return; // prevent duplicate submission
    hasSubmittedRef.current = true;

    const normalizedRating = newRating / outOf;

    const ratingEvent = {
      kind: 34259,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["d", entityId],
        ["m", entityType],
        ["rating", normalizedRating.toFixed(3)],
      ],
      content: content || "",
      pubkey: "",
      id: "",
      sig: "",
    };
    if(content) ratingEvent.tags.push(["c", "true"])

    try {
      const signed = await signEvent(ratingEvent, signer);
      if(!signed) throw new Error("Signer couldn't sign Event")
      poolRef.current.publish(relays, signed);
    } catch (err) {
      console.error("Error publishing rating:", err);
    } finally {
      hasSubmittedRef.current = false;
    }
  };

  const entityRatings = ratings.get(entityId);
  const average =
    entityRatings && entityRatings.size > 0
      ? Array.from(entityRatings.values()).reduce((a, b) => a + b, 0) /
        entityRatings.size
      : null;

  return {
    averageRating: average,
    totalRatings: entityRatings?.size || 0,
    submitRating,
    userRatingEvent
  };
};
