// nip46.ts
import { generateSecretKey, Event as NostrEvent } from "nostr-tools";
import {
  BunkerSignerParams,
  BunkerPointer,
  parseBunkerInput,
  BunkerSigner,
} from "nostr-tools/nip46";
import { NostrSigner } from "./types";
import { getAppSecretKeyFromLocalStorage } from "../../utils/localStorage";

export async function createNip46Signer(
  /** e.g. "bunker://…", or "nostrconnect://…" */
  bunkerUri: string,
  /** optional: relay pool, onauth callback, etc. */
  params: BunkerSignerParams = {}
): Promise<NostrSigner> {
  // 1️⃣ Parse URI to get relays / remote-signer-pubkey / secret
  const bp: BunkerPointer | null = await parseBunkerInput(bunkerUri);

  if (!bp) throw new Error("Invalid NIP-46 URI");

  // 2️⃣ Generate disposable client keypair
  const clientSecretKey: Uint8Array = getAppSecretKeyFromLocalStorage();

  // 3️⃣ Instantiate the NIP-46 signer
  const bunker = new BunkerSigner(clientSecretKey, bp, params);
  console.log("BUNKER Created", bunker);

  // 4️⃣ Handshake: ping → connect → get_public_key
  await bunker.connect();
  const wrapper: NostrSigner = {
    getPublicKey: async () => await bunker.getPublicKey(),
    signEvent: async (event: NostrEvent) => {
      // client-pubkey is baked into the conversation, remote returns correctly‐signed user-event
      return bunker.signEvent(event);
    },
    encrypt: async (pubkey, plaintext) =>
      bunker.nip04Encrypt(pubkey, plaintext),
    decrypt: async (pubkey, ciphertext) =>
      bunker.nip04Decrypt(pubkey, ciphertext),
    nip44Encrypt: async (pubkey, txt) => bunker.nip44Encrypt(pubkey, txt),
    nip44Decrypt: async (pubkey, ct) => bunker.nip44Decrypt(pubkey, ct),
  };

  return wrapper;
}
