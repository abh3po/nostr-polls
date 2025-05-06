import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { generateSecretKey } from "nostr-tools";

const LOCAL_STORAGE_KEYS = "pollerama:keys";
const LOCAL_BUNKER_URI = "pollerama:bunkerUri";
const LOCAL_APP_SECRET_KEY = "bunker:clientSecretKey";

type Keys = { pubkey: string; secret?: string };
type BunkerUri = { bunkerUri: string };

export const getKeysFromLocalStorage = () => {
  return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS) || "{}") as Keys;
};

export const getBunkerUriInLocalStorage = () => {
  return JSON.parse(
    localStorage.getItem(LOCAL_BUNKER_URI) || "{}"
  ) as BunkerUri;
};

export const getAppSecretKeyFromLocalStorage = () => {
  const hexSecretKey = localStorage.getItem(LOCAL_APP_SECRET_KEY);
  if (!hexSecretKey) {
    const newSecret = generateSecretKey();
    localStorage.setItem(LOCAL_APP_SECRET_KEY, bytesToHex(newSecret));
    return newSecret;
  }
  return hexToBytes(hexSecretKey);
};

export const setAppSecretInLocalStorage = (secret: Uint8Array) => {
  localStorage.setItem(LOCAL_STORAGE_KEYS, bytesToHex(secret));
};

export const setKeysInLocalStorage = (pubkey: string, secret?: string) => {
  localStorage.setItem(LOCAL_STORAGE_KEYS, JSON.stringify({ pubkey, secret }));
};

export const setBunkerUriInLocalStorage = (bunkerUri: string) => {
  localStorage.setItem(LOCAL_BUNKER_URI, JSON.stringify({ bunkerUri }));
};

export const removeKeysFromLocalStorage = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEYS);
};

export const removeBunkerUriFromLocalStorage = () => {
  localStorage.removeItem(LOCAL_BUNKER_URI);
};

export const removeAppSecretFromLocalStorage = () => {
  localStorage.removeItem(LOCAL_APP_SECRET_KEY);
};
