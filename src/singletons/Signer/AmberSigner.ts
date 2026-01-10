import { EventTemplate } from "nostr-tools";
import { NostrSigner } from "./types";
import { App } from "@capacitor/app";
import { Event } from "nostr-tools";

export function createAmberSigner(): NostrSigner {
  return {
    async getPublicKey(): Promise<string> {
      return new Promise((resolve, reject) => {
        const callbackUrl = encodeURIComponent("nostr-polls://signer-callback");
        const permissions = encodeURIComponent(
          JSON.stringify([{ type: "sign_event" }])
        );
        console.log("INsideget Public key opening amber");

        const url = `nostrsigner:?compressionType=none&returnType=result&type=get_public_key&appName=Pollerama&callbackUrl=https://example.com/?event=`;

        // Listen once for Amber response
        // App.addListener("appUrlOpen", ({ url }) => {
        //   if (!url.startsWith("nostr-polls://signer-callback")) return;

        //   const parsed = new URL(url);
        //   const pubkey = parsed.searchParams.get("result");

        //   if (!pubkey) {
        //     reject(new Error("Amber login rejected"));
        //     return;
        //   }

        //   resolve(pubkey);
        // });

        // Trigger Amber
        window.location.href = url;
      });
    },

    async signEvent(event: EventTemplate): Promise<Event> {
      return new Promise<Event>(async (resolve, reject) => {
        const callbackUrl = encodeURIComponent("nostr-polls://signer-callback");
        const encodedEvent = encodeURIComponent(JSON.stringify(event));

        const url = `nostrsigner:${encodedEvent}?type=sign_event&returnType=event&compressionType=none&callbackUrl=${callbackUrl}`;

        const handle = await App.addListener("appUrlOpen", ({ url }) => {
          if (!url.startsWith("nostr-polls://signer-callback")) return;

          handle.remove();

          const parsed = new URL(url);
          const eventJson = parsed.searchParams.get("event");

          if (!eventJson) {
            reject(new Error("Amber signing rejected"));
            return;
          }

          resolve(JSON.parse(eventJson));
        });

        window.location.href = url;
      });
    },
  };
}
