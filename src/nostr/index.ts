import { Event, EventTemplate, finalizeEvent, SimplePool } from "nostr-tools";
import { hexToBytes } from "@noble/hashes/utils";
import { pool } from "../singletons";
import { signerManager } from "../singletons/Signer/SignerManager";

export const defaultRelays = [
  "wss://relay.damus.io/",
  "wss://relay.primal.net/",
  "wss://nos.lol",
  "wss://relay.nostr.wirednet.jp/",
  "wss://nostr-01.yakihonne.com",
  "wss://relay.snort.social",
  "wss://relay.nostr.band",
  "wss://nostr21.com",
];

export const fetchUserProfile = async (
  pubkey: string,
  relays: string[] = defaultRelays
) => {
  let result = await pool.get(relays, { kinds: [0], authors: [pubkey] });
  return result;
};

export async function parseContacts(contactList: Event) {
  if (contactList) {
    return contactList.tags.reduce<Set<string>>((result, [name, value]) => {
      if (name === "p") {
        result.add(value);
      }
      return result;
    }, new Set<string>());
  }
  return new Set<string>();
}

export const fetchUserProfiles = async (
  pubkeys: string[],
  pool: SimplePool,
  relays: string[] = defaultRelays
) => {
  let result = await pool.querySync(relays, {
    kinds: [0],
    authors: pubkeys,
  });
  return result;
};

export const fetchComments = async (
  eventIds: string[],
  pool: SimplePool,
  relays: string[] = defaultRelays
) => {
  let result = await pool.querySync(relays, {
    kinds: [1],
    "#e": eventIds,
  });
  return result;
};

export const fetchLikes = async (
  eventIds: string[],
  pool: SimplePool,
  relays: string[] = defaultRelays
) => {
  let result = await pool.querySync(relays, {
    kinds: [7],
    "#e": eventIds,
  });
  return result;
};

export const fetchZaps = async (
  eventIds: string[],
  pool: SimplePool,
  relays: string[] = defaultRelays
) => {
  let result = await pool.querySync(relays, {
    kinds: [9735],
    "#e": eventIds,
  });
  return result;
};

export function openProfileTab(npub: `npub1${string}`) {
  let url = `https://njump.me/${npub}`;
  window?.open(url, "_blank")?.focus();
}

export const getATagFromEvent = (event: Event) => {
  let d_tag = event.tags.find((tag) => tag[0] === "d")?.[1];
  let a_tag = d_tag
    ? `${event.kind}:${event.pubkey}:${d_tag}`
    : `${event.kind}:${event.pubkey}:`;
  return a_tag;
};

export const signEvent = async (event: EventTemplate, secret?: string) => {
  let signedEvent;
  let secretKey;
  if (secret) {
    secretKey = hexToBytes(secret);
    signedEvent = finalizeEvent(event, secretKey);
    return signedEvent;
  }
  const signer = await signerManager.getSigner();
  if (!signer) {
    throw Error("Login Method Not Provided");
  }
  signedEvent = await signer.signEvent(event);
  return signedEvent;
};

export class MiningTracker {
  public cancelled: boolean;
  public maxDifficultySoFar: number;
  public hashesComputed: number;
  constructor() {
    this.cancelled = false;
    this.maxDifficultySoFar = 0;
    this.hashesComputed = 0;
  }

  cancel() {
    this.cancelled = true;
  }
}
