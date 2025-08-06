import { nip07Signer } from "./NIP07Signer";
import { createNip46Signer } from "./BunkerSigner";
import { NostrSigner } from "./types";
import { Event, EventTemplate } from "nostr-tools";
import { defaultRelays, fetchUserProfile, signEvent } from "../../nostr";
import {
  getBunkerUriInLocalStorage,
  getKeysFromLocalStorage,
  setBunkerUriInLocalStorage,
  setKeysInLocalStorage,
  setUserDataInLocalStorage,
  getUserDataFromLocalStorage,
  removeUserDataFromLocalStorage,
  removeKeysFromLocalStorage,
  removeBunkerUriFromLocalStorage,
  removeAppSecretFromLocalStorage,
} from "../../utils/localStorage";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import { ANONYMOUS_USER_NAME, User } from "../../contexts/user-context";
import { bytesToHex } from "@noble/hashes/utils";
import { pool } from "..";
import { createLocalSigner } from "./LocalSigner";

class SignerManager {
  private signer: NostrSigner | null = null;
  private user: User | null = null;
  private onChangeCallbacks: Set<() => void> = new Set();
  private loginModalCallback: (() => Promise<void>) | null = null;

  constructor() {
    this.restoreFromStorage();
  }

  async publishKind0(user: User) {
    if (!this.signer) throw new Error("No signer available");

    const pubkey = await this.signer.getPublicKey();

    const kind0Event: EventTemplate = {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify({
        name: user.name,
        about: user.about || "",
        picture: user.picture || "",
      }),
    };
    const signedKind0 = await this.signer.signEvent(kind0Event);
    pool.publish(defaultRelays, signedKind0);

    // Here you should publish the event to Nostr relays
    // Example: await relayPool.publish(kind0Event);
    // Or call your existing function to publish events

    // For now, just log it:
    console.log("Publishing kind-0 event:", kind0Event);

    // TODO: Replace with your actual event publish method
  }

  registerLoginModal(callback: () => Promise<void>) {
    this.loginModalCallback = callback;
  }

  async restoreFromStorage() {
    const keys = getKeysFromLocalStorage();
    const bunkerUri = getBunkerUriInLocalStorage();
    const cachedUser = getUserDataFromLocalStorage();

    if (cachedUser) {
      this.user = cachedUser.user;
    }

    try {
      if (bunkerUri?.bunkerUri) {
        await this.loginWithNip46(bunkerUri.bunkerUri);
      } else if (window.nostr) {
        console.log("Restoring loginWithNip07");
        await this.loginWithNip07();
      } else if (keys?.pubkey && keys?.secret) {
        console.log("Restoring guest");
        await this.loginWithGuestKey(keys.pubkey, keys.secret);
      }
    } catch (e) {
      console.error("Signer restore failed:", e);
    }
    this.notify();
  }
  private async loginWithGuestKey(pubkey: string, privkey: string) {
    this.signer = createLocalSigner(privkey);

    const kind0: Event | null = await fetchUserProfile(pubkey);
    const userData: User = kind0
      ? { ...JSON.parse(kind0.content), pubkey, privateKey: privkey }
      : {
          pubkey,
          name: ANONYMOUS_USER_NAME,
          picture: DEFAULT_IMAGE_URL,
          privateKey: privkey,
        };

    setUserDataInLocalStorage(userData);
    this.user = userData;
  }

  async createGuestAccount(
    privkey: string,
    userMetadata: { name?: string; picture?: string; about?: string }
  ) {
    this.signer = createLocalSigner(privkey);

    const pubkey = await this.signer.getPublicKey();

    // Build user object
    const userData: User = {
      pubkey,
      name: userMetadata.name || "Guest",
      picture: userMetadata.picture || DEFAULT_IMAGE_URL,
      about: userMetadata.about || "",
      privateKey: privkey,
    };

    // Save keys and user data
    setKeysInLocalStorage(pubkey, privkey);
    setUserDataInLocalStorage(userData);

    this.user = userData;

    // Optionally, send kind-0 event to publish metadata on Nostr network
    await this.publishKind0(userData);

    this.notify();
  }

  async loginWithNip07() {
    console.log("LOGGIN IN WITH NIP07");
    if (!window.nostr) throw new Error("NIP-07 extension not found");
    this.signer = nip07Signer;
    const pubkey = await window.nostr.getPublicKey();
    setKeysInLocalStorage(pubkey);

    const kind0: Event | null = await fetchUserProfile(pubkey);
    const userData: User = kind0
      ? { ...JSON.parse(kind0.content), pubkey }
      : { pubkey, name: ANONYMOUS_USER_NAME, picture: DEFAULT_IMAGE_URL };

    this.user = userData;
    setUserDataInLocalStorage(userData);
    this.notify();
    console.log("LOGGIN IN WITH NIP07 IS NOW COMPLETE");
  }

  async loginWithNip46(bunkerUri: string) {
    const remoteSigner = await createNip46Signer(bunkerUri);
    const pubkey = await remoteSigner.getPublicKey();
    setKeysInLocalStorage(pubkey);

    const kind0: Event | null = await fetchUserProfile(pubkey);
    const userData: User = kind0
      ? { ...JSON.parse(kind0.content), pubkey }
      : { pubkey, name: ANONYMOUS_USER_NAME, picture: DEFAULT_IMAGE_URL };

    setUserDataInLocalStorage(userData);
    setBunkerUriInLocalStorage(bunkerUri);

    this.signer = remoteSigner;
    this.user = userData;
    this.notify();
  }

  logout() {
    this.signer = null;
    this.user = null;

    removeKeysFromLocalStorage();
    removeBunkerUriFromLocalStorage();
    removeAppSecretFromLocalStorage();
    removeUserDataFromLocalStorage();
    console.log("Logged out from everywhere");
    this.notify();
  }

  async getSigner(): Promise<NostrSigner> {
    console.log("EXisting signer is", this.signer);
    if (this.signer) return this.signer;

    if (this.loginModalCallback) {
      await this.loginModalCallback();
      if (this.signer) return this.signer;
    }

    throw new Error("No signer available and no login modal registered.");
  }

  getUser() {
    return this.user;
  }

  onChange(cb: () => void) {
    this.onChangeCallbacks.add(cb);
    return () => this.onChangeCallbacks.delete(cb);
  }

  private notify() {
    this.onChangeCallbacks.forEach((cb) => cb());
  }
}

export const signerManager = new SignerManager();
