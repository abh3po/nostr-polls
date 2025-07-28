import { nip07Signer } from "./NIP07Signer";
import { createNip46Signer } from "./BunkerSigner";
import { NostrSigner } from "./types";
import { Event } from "nostr-tools";
import { fetchUserProfile } from "../../nostr";
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

class SignerManager {
  private signer: NostrSigner | null = null;
  private user: User | null = null;
  private onChangeCallbacks: Set<() => void> = new Set();
  private loginModalCallback: (() => Promise<void>) | null = null;

  constructor() {
    this.restoreFromStorage();
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
      } else if (keys.pubkey) {
        console.log("Restoring loginWithNip07")
        await this.loginWithNip07();
      }
    } catch (e) {
      console.error("Signer restore failed:", e);
    }
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
    console.log("EXisting signer is", this.signer)
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
