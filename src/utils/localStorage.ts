import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { generateSecretKey } from "nostr-tools";
import { User } from "../contexts/user-context";
import { USER_DATA_TTL_HOURS } from "./constants";

const LOCAL_STORAGE_KEYS = "pollerama:keys";
const LOCAL_BUNKER_URI = "pollerama:bunkerUri";
const LOCAL_APP_SECRET_KEY = "bunker:clientSecretKey";
const LOCAL_USER_DATA = "pollerama:userData";

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

type UserData = {
  user: User;
  expiresAt: number;
};

export const setUserDataInLocalStorage = (
  user: User,
  ttlInHours = USER_DATA_TTL_HOURS
) => {
  const now = new Date();
  const expiresAt = now.setHours(now.getHours() + ttlInHours);

  const userData: UserData = {
    user,
    expiresAt,
  };

  localStorage.setItem(LOCAL_USER_DATA, JSON.stringify(userData));
};

export const getUserDataFromLocalStorage = (): { user: User } | null => {
  const data = localStorage.getItem(LOCAL_USER_DATA);
  if (!data) return null;

  try {
    const { user, expiresAt } = JSON.parse(data) as UserData;
    const isExpired = Date.now() > expiresAt;

    // Remove expired data
    if (isExpired) {
      localStorage.removeItem(LOCAL_USER_DATA);
      return null;
    }

    return { user };
  } catch (error) {
    console.error("Failed to parse user data from localStorage", error);
    return null;
  }
};

export const removeUserDataFromLocalStorage = () => {
  localStorage.removeItem(LOCAL_USER_DATA);
};
