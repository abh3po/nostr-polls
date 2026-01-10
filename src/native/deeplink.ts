import { App } from "@capacitor/app";
import { signerManager } from "../singletons/Signer/SignerManager";

export function setupDeepLinks() {
  App.addListener("appUrlOpen", async ({ url }) => {
    if (!url) return;

    if (!url.startsWith("nostr-polls://")) return;

    try {
      const parsed = new URL(url);

      // Amber / NIP-55 callback
      if (parsed.host === "signer-callback") {
        const event = parsed.searchParams.get("event");
        if (!event) return;

        // get_public_key OR signed event
        await signerManager.handleSignerCallback(event);
      }
    } catch (err) {
      console.error("Deep link error", err);
    }
  });
}
