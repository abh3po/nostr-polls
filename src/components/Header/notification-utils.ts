import { Event } from "nostr-tools";

export type ParsedNotification = {
    type: "poll-response" | "comment" | "reaction" | "zap" | "unknown";
    pollId?: string;
    postId?: string;
    fromPubkey: string | null;
    content?: string;
    reaction?: string;
    sats?: number | null;
};

export function parseNotification(ev: Event): ParsedNotification {
    const getTag = (k: string) => ev.tags.find((t) => t[0] === k)?.[1] ?? null;

    // Check who sent it
    const fromPubkey = ev.pubkey ?? null;

    // POLL RESPONSE
    if (ev.kind === 1018) {
        return {
            type: "poll-response",
            pollId: getTag("e") || undefined,
            fromPubkey,
            content: ev.content,
        };
    }

    // COMMENT
    if (ev.kind === 1 && getTag("p")) {
        return {
            type: "comment",
            fromPubkey,
            postId: getTag("e") ?? undefined,
            content: ev.content,
        };
    }

    // REACTION
    if (ev.kind === 7) {
        return {
            type: "reaction",
            fromPubkey,
            postId: getTag("e") ?? undefined,
            reaction: ev.content,
        };
    }

    // ZAP
    if (ev.kind === 9735) {
        const bolt11 = ev.tags.find((t) => t[0] === "bolt11")?.[1];
        let sats: number | null = null;

        if (bolt11 && bolt11.includes("1p")) {
            // best-effort parse, no invoice lib needed
            const num = bolt11.match(/(\d+)p/)?.[1];
            sats = num ? parseInt(num, 10) : null;
        }

        return {
            type: "zap",
            fromPubkey,
            sats,
        };
    }

    return {
        type: "unknown",
        fromPubkey,
    };
}
