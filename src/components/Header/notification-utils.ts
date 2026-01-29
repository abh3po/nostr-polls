import { Event, nip57 } from "nostr-tools";

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
        let sats: number | null = null;
        const bolt11Tag = ev.tags.find((t) => t[0] === "bolt11")?.[1];
        const requestEvent = ev.tags.find((t) => t[0] === "description")?.[1];

        if (bolt11Tag) {
            try {
                sats = nip57.getSatoshisAmountFromBolt11(bolt11Tag);
            } catch (e) {
                console.log("Failed to parse bolt11 invoice", e, ev);
            }
        }

        // Get sender pubkey from the zap request
        let senderPubkey = fromPubkey;
        if (requestEvent) {
            try {
                const reqObj = JSON.parse(requestEvent) as Event;
                senderPubkey = reqObj.pubkey;
            } catch (e) {
                console.log("Failed to parse zap request event", e, ev);
            }
        }

        return {
            type: "zap",
            sats,
            fromPubkey: senderPubkey,
        };
    }

    return {
        type: "unknown",
        fromPubkey,
    };
}
