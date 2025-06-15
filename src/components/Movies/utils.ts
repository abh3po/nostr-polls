// src/utils/selectBestMetadataEvent.ts
import { Event } from "nostr-tools";

export function selectBestMetadataEvent(
  events: Event[],
  follows: string[] | undefined
): Event | null {
  const seen = new Set<string>();

  const uniqueEvents = events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  return (
    uniqueEvents
      .sort((a, b) => {
        const aFollowed = follows?.includes(a.pubkey) ?? false;
        const bFollowed = follows?.includes(b.pubkey) ?? false;

        if (aFollowed && !bFollowed) return -1;
        if (!aFollowed && bFollowed) return 1;

        return b.created_at - a.created_at;
      })[0] || null
  );
}
