// hooks/useRating.ts
import { useContext, useEffect, useRef } from "react";
import { getEventHash } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import { RatingContext } from "./RatingProvider";
import { useAppContext } from "../../hooks/useAppContext";

export const useRating = (entityId: string) => {
  const { ratings, registerEntityId } = useContext(RatingContext);
  const { poolRef } = useAppContext();
  const hasSubmittedRef = useRef(false);

  // Register entityId with the RatingsProvider
  useEffect(() => {
    registerEntityId(entityId);
  }, [entityId, registerEntityId]);

  const submitRating = async (
    newRating: number,
    outOf: number = 5,
    entityType: string = "event"
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
      content: "Rated via Nostr",
      pubkey: "",
      id: "",
      sig: "",
    };

    try {
      if (window.nostr) {
        const signed = await window.nostr.signEvent(ratingEvent);
        ratingEvent.id = getEventHash(signed);
        ratingEvent.pubkey = signed.pubkey;
        ratingEvent.sig = signed.sig;

        poolRef.current.publish(defaultRelays, ratingEvent);
      } else {
        alert("Nostr signer not found");
      }
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
  };
};
