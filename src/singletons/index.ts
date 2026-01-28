import { SimplePool } from "nostr-tools";
import { createNostrRuntime } from "../nostrRuntime";

export const pool = new SimplePool();
export const nostrRuntime = createNostrRuntime(pool);
