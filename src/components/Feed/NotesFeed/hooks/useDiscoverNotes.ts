import { pool } from "../../../../singletons";
import { useRelays } from "../../../../hooks/useRelays";
import { Filter } from "nostr-tools/lib/types";
import { useState } from "react";

export const useDiscoverNotes = () => {
    const { relays } = useRelays();
    const [notes, SetNotes] = useState<Map<string, any>>(new Map());
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchNotes = (webOfTrust: Set<string>) => {
        console.log("Fetching notes from web of trust of size", webOfTrust.size);
        const filter: Filter = {
            kinds: [1],
            authors: Array.from(webOfTrust),
            limit: 20,
        }
        setLoadingMore(true);
        console.log("Fetching notes with filter", filter);
        const closer = pool.subscribeMany(relays, [filter], {
            onevent: (event) => {
                console.log("GOST DISCOVER NOTE", event);
                SetNotes((prev) => {
                    const updated = new Map(prev);
                    const existing = updated.get(event.id);
                    if (!existing || existing.created_at < event.created_at) {
                        updated.set(event.id, event);
                    }
                    return updated;
                });
                setLoadingMore(false);
            }
        })
        return closer
    }
    return { notes, loadingMore, fetchNotes };
}