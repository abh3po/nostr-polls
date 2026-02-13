import {
  Event,
  EventTemplate,
  Filter,
  nip19,
  nip44,
  UnsignedEvent,
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
} from "nostr-tools";
import { bytesToHex } from "@noble/hashes/utils";
import { sha256 } from "@noble/hashes/sha256";
import { pool } from "../singletons";
import { NostrSigner } from "../singletons/Signer/types";
import { signerManager } from "../singletons/Signer/SignerManager";

export interface NRPCConfig {
  serverPubkey: string;
  relays: string[];
  timeout?: number;
}

export interface NRPCError {
  code: number;
  message: string;
}

// nRPC event kinds
const KIND_NRPC_REQUEST = 22068; // Plain request
const KIND_NRPC_RESPONSE = 22069; // Plain response
const KIND_NRPC_GIFTWRAP = 21169; // Encrypted request/response (gift wrap) - used for BOTH
const KIND_NRPC_REQUEST_RUMOR = 68; // Encrypted request rumor (inside gift wrap)
const KIND_SEAL = 25; // Seal (NIP-59)

/**
 * Get current timestamp.
 */
function currentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Compute a deterministic rumor ID from an unsigned event.
 */
function computeRumorId(rumor: UnsignedEvent): string {
  const serialized = JSON.stringify([
    0,
    rumor.pubkey,
    rumor.created_at,
    rumor.kind,
    rumor.tags,
    rumor.content,
  ]);
  return bytesToHex(sha256(new TextEncoder().encode(serialized)));
}

/**
 * Create an encrypted nRPC request using signer's nip44Encrypt.
 * Works for both LocalSigner and external signers.
 * Returns both the wrap event and the rumor ID.
 */
async function createEncryptedRequestForSigner(
  signer: NostrSigner,
  senderPubkey: string,
  serverPubkey: string,
  method: string,
  params: Record<string, string>
): Promise<{ wrap: Event; rumorId: string }> {
  console.log(`[nRPC] createEncryptedRequest - method: ${method}, params:`, params);

  if (!signer.nip44Encrypt) {
    throw new Error("Signer does not support NIP-44 encryption");
  }

  // Step 1: Create rumor (kind 68)
  const tags: string[][] = [
    ["method", method],
    ["p", serverPubkey],
    ...Object.entries(params).map(([key, value]) => ["param", key, value]),
  ];

  const rumor: UnsignedEvent = {
    kind: KIND_NRPC_REQUEST_RUMOR,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: "",
    pubkey: senderPubkey,
  };

  const rumorWithId = {
    ...rumor,
    id: computeRumorId(rumor),
  };
  console.log(`[nRPC] Created rumor with ID: ${rumorWithId.id}`);

  // Step 2: Encrypt rumor into a seal
  const rumorJson = JSON.stringify(rumorWithId);
  console.log(`[nRPC] Encrypting rumor for server...`);
  const encryptedRumor = await signer.nip44Encrypt(serverPubkey, rumorJson);
  console.log(`[nRPC] Rumor encrypted, length: ${encryptedRumor.length}`);

  // Step 3: Create and sign the seal (kind 25)
  const sealTemplate: EventTemplate = {
    kind: KIND_SEAL,
    created_at: currentTimestamp(),
    tags: [],
    content: encryptedRumor,
  };
  console.log(`[nRPC] Signing seal...`);
  const seal = await signer.signEvent(sealTemplate);
  console.log(`[nRPC] Seal signed, ID: ${seal.id}`);

  // Step 4: Create gift wrap with ephemeral key
  const ephemeralKey = generateSecretKey();
  const ephemeralPubkey = getPublicKey(ephemeralKey);
  console.log(`[nRPC] Creating gift wrap with ephemeral key: ${ephemeralPubkey}`);

  const sealJson = JSON.stringify(seal);
  const wrapConvKey = nip44.getConversationKey(ephemeralKey, serverPubkey);
  const encryptedSeal = nip44.encrypt(sealJson, wrapConvKey);

  const wrapEvent: UnsignedEvent = {
    kind: KIND_NRPC_GIFTWRAP,
    created_at: currentTimestamp(),
    tags: [["p", serverPubkey]],
    content: encryptedSeal,
    pubkey: ephemeralPubkey,
  };

  const wrap = finalizeEvent(wrapEvent, ephemeralKey);
  console.log(`[nRPC] Gift wrap created, ID: ${wrap.id}`);

  return {
    wrap,
    rumorId: rumorWithId.id,
  };
}

/**
 * Decrypt an encrypted nRPC response (kind 21169 gift wrap).
 */
async function decryptResponse(
  wrapEvent: Event,
  serverPubkey: string
): Promise<Event> {
  const signer = await signerManager.getSigner();

  if (!signer.nip44Decrypt) {
    throw new Error("Signer does not support NIP-44 decryption");
  }

  // Step 1: Decrypt gift wrap to get seal
  const sealJson = await signer.nip44Decrypt(wrapEvent.pubkey, wrapEvent.content);
  const seal: Event = JSON.parse(sealJson);

  // Step 2: Decrypt seal to get rumor
  const rumorJson = await signer.nip44Decrypt(seal.pubkey, seal.content);
  const rumor = JSON.parse(rumorJson);

  return rumor;
}

/**
 * Generic nRPC client for making RPC calls over Nostr
 *
 * Implements the nRPC protocol:
 * - Plain: kind 22068 request → kind 22069 response
 * - Encrypted: kind 21169 request (gift wrap) → kind 21170 response (gift wrap)
 *   - Request rumor: kind 68 with ["method"] and ["param", key, value] tags
 *   - Response rumor: kind 69 with #e tag referencing request rumor ID
 * - Results: ["result", key, value] or ["result_json", json_string] tags
 * - Errors: status != 200 or ["error"] tag
 */
export class NRPCClient {
  private config: NRPCConfig;
  private serverPubkeyHex: string;

  constructor(config: NRPCConfig) {
    this.config = {
      timeout: 15000, // 15 seconds default
      ...config,
    };
    // Normalize pubkey to hex format
    this.serverPubkeyHex = this.normalizePublicKey(config.serverPubkey);
  }

  /**
   * Convert npub to hex if needed, otherwise return as-is
   */
  private normalizePublicKey(pubkey: string): string {
    if (pubkey.startsWith("npub")) {
      try {
        const decoded = nip19.decode(pubkey);
        if (decoded.type === "npub") {
          return decoded.data;
        }
      } catch (error) {
        console.error("Failed to decode npub:", error);
        throw new Error("Invalid npub format");
      }
    }
    return pubkey;
  }

  /**
   * Make an nRPC call
   *
   * @param method - RPC method name (e.g., "generatePrompt", "getAIModels")
   * @param params - Parameters as key-value pairs
   * @param signer - Nostr signer to sign the request
   * @param encrypted - Use encrypted request (default: true)
   * @returns Promise resolving to the result (parsed from response tags)
   */
  async call(
    method: string,
    params: Record<string, string>,
    signer: NostrSigner,
    encrypted: boolean = true,
  ): Promise<any> {
    console.log(`[nRPC] Calling method: ${method}, encrypted: ${encrypted}`);
    let signedRequest: Event;
    let requestId: string; // For encrypted: rumor ID, for plain: event ID

    if (encrypted) {
      // Create encrypted request (kind 21169 gift wrap)
      const senderPubkey = await signer.getPublicKey();
      console.log(`[nRPC] Sender pubkey: ${senderPubkey}`);
      console.log(`[nRPC] Server pubkey: ${this.serverPubkeyHex}`);

      // Use signer's nip44Encrypt method (works for both LocalSigner and external signers)
      const result = await createEncryptedRequestForSigner(
        signer,
        senderPubkey,
        this.serverPubkeyHex,
        method,
        params
      );

      signedRequest = result.wrap;
      requestId = result.rumorId; // Track rumor ID for matching response
      console.log(`[nRPC] Created encrypted request. Wrap ID: ${signedRequest.id}, Rumor ID: ${requestId}`);
      console.log(`[nRPC] Wrap event:`, JSON.stringify(signedRequest, null, 2));
    } else {
      // Plain request (kind 22068)
      const requestTemplate: EventTemplate = {
        kind: KIND_NRPC_REQUEST,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["method", method],
          ["p", this.serverPubkeyHex],
          ...Object.entries(params).map(([key, value]) => ["param", key, value]),
        ],
        content: "",
      };

      signedRequest = await signer.signEvent(requestTemplate);
      requestId = signedRequest.id; // Track event ID for plain requests
    }

    // Subscribe for response before publishing request
    console.log(`[nRPC] Subscribing for response with requestId: ${requestId}`);
    const responsePromise = this.waitForResponse(requestId, encrypted);

    // Publish request to relays
    console.log(`[nRPC] Publishing to relays:`, this.config.relays);
    try {
      const results = await Promise.allSettled(pool.publish(this.config.relays, signedRequest));
      console.log(`[nRPC] Publish results:`, results);
    } catch (error) {
      console.error(`[nRPC] Publish error:`, error);
      throw new Error(`Failed to publish request: ${error}`);
    }

    // Wait for response (with timeout)
    console.log(`[nRPC] Waiting for response (timeout: ${this.config.timeout}ms)...`);
    const response = await this.withTimeout(
      responsePromise,
      this.config.timeout!,
      `nRPC call to ${method} timed out after ${this.config.timeout}ms`,
    );

    console.log(`[nRPC] Received response:`, response);
    return response;
  }

  /**
   * Wait for nRPC response event
   */
  private waitForResponse(requestId: string, encrypted: boolean): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const filter: Filter = encrypted
        ? {
            // For encrypted responses, wait for kind 21169 gift wrap with #e = rumor ID
            kinds: [KIND_NRPC_GIFTWRAP],
            "#e": [requestId], // Server puts ["e", rumorId] on the response wrap
          }
        : {
            // For plain responses, wait for kind 22069 with #e = request ID
            kinds: [KIND_NRPC_RESPONSE],
            "#e": [requestId],
            authors: [this.serverPubkeyHex],
          };

      console.log(`[nRPC] Subscribing with filter:`, JSON.stringify(filter, null, 2));
      let resolved = false;

      const sub = pool.subscribeMany(this.config.relays, [filter], {
        onevent: async (event: Event) => {
          console.log(`[nRPC] Received event:`, event);
          if (resolved) return;

          try {
            let responseEvent = event;

            // Decrypt if encrypted
            if (encrypted && event.kind === KIND_NRPC_GIFTWRAP) {
              console.log(`[nRPC] Decrypting response...`);
              responseEvent = await decryptResponse(event, this.serverPubkeyHex);
              console.log(`[nRPC] Decrypted response:`, responseEvent);
              // No need to verify #e tag - already filtered by it
            }

            resolved = true;

            // Parse response
            const result = this.parseResponse(responseEvent);
            console.log(`[nRPC] Parsed result:`, result);
            sub.close();
            resolve(result);
          } catch (error) {
            console.error(`[nRPC] Error processing response:`, error);
            sub.close();
            reject(error);
          }
        },
        oneose: () => {
          console.log(`[nRPC] EOSE received`);
          // EOSE received but no response yet - keep waiting
          // The timeout will handle this if the response never arrives
        },
      });

      // Store sub for cleanup on timeout
      (this.waitForResponse as any)._activeSub = sub;
    });
  }

  /**
   * Parse nRPC response event
   */
  private parseResponse(event: Event): any {
    // Check status
    const statusTag = event.tags.find((t) => t[0] === "status");
    const status = statusTag ? parseInt(statusTag[1], 10) : 200;

    if (status !== 200) {
      // Check for error tag
      const errorTag = event.tags.find((t) => t[0] === "error");
      const errorMessage = errorTag ? errorTag[1] : "Unknown error";

      const error: any = new Error(errorMessage);
      error.status = status;
      error.nrpcError = true;
      throw error;
    }

    // Parse result
    // First check for result_json (single JSON result)
    const resultJsonTag = event.tags.find((t) => t[0] === "result_json");
    if (resultJsonTag) {
      try {
        return JSON.parse(resultJsonTag[1]);
      } catch (error) {
        throw new Error(`Failed to parse result_json: ${error}`);
      }
    }

    // Otherwise, collect all "result" tags
    const resultTags = event.tags.filter((t) => t[0] === "result");

    if (resultTags.length === 0) {
      throw new Error("Response has no results");
    }

    // If single result with 2 elements, return just the value
    if (resultTags.length === 1 && resultTags[0].length === 2) {
      return resultTags[0][1];
    }

    // If single result with 3 elements, return as object { key: value }
    if (resultTags.length === 1 && resultTags[0].length === 3) {
      return { [resultTags[0][1]]: resultTags[0][2] };
    }

    // Multiple results - return as array of objects
    return resultTags
      .map((tag) => {
        if (tag.length === 2) {
          return tag[1]; // Just value
        } else if (tag.length === 3) {
          return { [tag[1]]: tag[2] }; // { key: value }
        }
        return null;
      })
      .filter((r) => r !== null);
  }

  /**
   * Helper to add timeout to a promise
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          // Clean up active subscription if exists
          const sub = (this.waitForResponse as any)._activeSub;
          if (sub) {
            sub.close();
          }
          reject(new Error(errorMessage));
        }, timeoutMs);
      }),
    ]);
  }
}
