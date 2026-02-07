import { Event } from "nostr-tools";
import { pool } from "../singletons";

const PUBLISH_TIMEOUT_MS = 5000;

interface PublishResult {
  ok: boolean;
  accepted: number;
  total: number;
}

export async function waitForPublish(
  relays: string[],
  event: Event
): Promise<PublishResult> {
  const total = relays.length;
  if (total === 0) return { ok: false, accepted: 0, total: 0 };

  const promises = pool.publish(relays, event);

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), PUBLISH_TIMEOUT_MS)
  );

  const results = await Promise.allSettled(
    promises.map((p) => Promise.race([p, timeout]))
  );

  const accepted = results.filter((r) => r.status === "fulfilled").length;
  return { ok: accepted > 0, accepted, total };
}
