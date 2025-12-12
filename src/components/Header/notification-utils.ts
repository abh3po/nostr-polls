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
        // console.log("Parsing zap event", ev);
        let sats: number | null = null;
        const requestEvent = ev.tags.find((t) => t[0] === "description")?.[1];
        let reqObj: Event | null = null;
        if (requestEvent) {
            try {
                reqObj = JSON.parse(requestEvent) as Event;
                sats = reqObj.tags.find((t) => t[0] === "amount")
                    ? parseInt(reqObj?.tags.find((t) => t[0] === "amount")![1], 10) / 1000
                    : null;
                return {
                    type: "zap",
                    sats,
                    fromPubkey: reqObj!.pubkey,
                }

            } catch (e) {
                console.log("Failed to parse zap request event", e, ev);
                return {
                    type: "unknown",
                    fromPubkey,
                }// ignore
            }
        }
        else {
            console.log("Failed to parse zap request event", ev);
            return {
                type: "unknown",
                fromPubkey,
            }//
        }
    }

    return {
        type: "unknown",
        fromPubkey,
    };
}
