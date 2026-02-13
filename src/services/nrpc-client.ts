import { Event, EventTemplate, Filter, nip19 } from "nostr-tools";
import { pool } from "../singletons";
import { NostrSigner } from "../singletons/Signer/types";

export interface NRPCConfig {
  serverPubkey: string;
  relays: string[];
  timeout?: number;
}

export interface NRPCError {
  code: number;
  message: string;
}

/**
 * Generic nRPC client for making RPC calls over Nostr
 *
 * Implements the nRPC protocol:
 * - Request: kind 22068 with ["method"] and ["param", key, value] tags
 * - Response: kind 22069 with #e tag referencing request ID
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
   * @returns Promise resolving to the result (parsed from response tags)
   */
  async call(
    method: string,
    params: Record<string, string>,
    signer: NostrSigner,
  ): Promise<any> {
    // 1. Build request event
    const requestTemplate: EventTemplate = {
      kind: 22068,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["method", method],
        ["p", this.serverPubkeyHex],
        ...Object.entries(params).map(([key, value]) => ["param", key, value]),
      ],
      content: "",
    };

    // 2. Sign the request
    const signedRequest: Event = await signer.signEvent(requestTemplate);

    // 3. Subscribe for response before publishing request
    const responsePromise = this.waitForResponse(signedRequest.id);

    // 4. Publish request to relays
    try {
      await Promise.allSettled(pool.publish(this.config.relays, signedRequest));
    } catch (error) {
      throw new Error(`Failed to publish request: ${error}`);
    }

    // 5. Wait for response (with timeout)
    const response = await this.withTimeout(
      responsePromise,
      this.config.timeout!,
      `nRPC call to ${method} timed out after ${this.config.timeout}ms`,
    );

    return response;
  }

  /**
   * Wait for nRPC response event
   */
  private waitForResponse(requestId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const filter: Filter = {
        kinds: [22069],
        "#e": [requestId],
        authors: [this.serverPubkeyHex],
      };
      let resolved = false;

      const sub = pool.subscribeMany(this.config.relays, [filter], {
        onevent: (event: Event) => {
          if (resolved) return;
          resolved = true;

          try {
            // Parse response
            const result = this.parseResponse(event);
            sub.close();
            resolve(result);
          } catch (error) {
            sub.close();
            reject(error);
          }
        },
        oneose: () => {
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
