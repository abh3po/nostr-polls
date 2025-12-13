import { useState, useRef, useCallback } from "react";
import { pool } from "../../../../singletons";
import { useRelays } from "../../../../hooks/useRelays";
import { Filter } from "nostr-tools/lib/types";
import { useUserContext } from "../../../../hooks/useUserContext";

const CHUNK_SIZE = 1000;
const LOAD_TIMEOUT_MS = 5000;

function chunkArray<T>(arr: T[], size: number): T[][] {
    const res = [];
    for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
    return res;
}

export const useDiscoverNotes = () => {
    const { relays } = useRelays();
    const { user } = useUserContext();
    const [notes, setNotes] = useState<Map<string, any>>(new Map());
    const [newNotes, setNewNotes] = useState<Map<string, any>>(new Map());
    const [loadingMore, setLoadingMore] = useState(false);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const subscriptionsRef = useRef<any[]>([]);
    const fetchedRef = useRef(false);

    const mergeNewNotes = useCallback(() => {
        setNotes((prev) => {
            const merged = new Map(prev);
            newNotes.forEach((note, id) => {
                merged.set(id, note);
            });
            return merged;
        });
        setNewNotes(new Map());
    }, [newNotes]);

    const fetchNotes = useCallback((webOfTrust: Set<string>) => {
        if (!webOfTrust?.size || !relays?.length || fetchedRef.current) return;

        fetchedRef.current = true;
        subscriptionsRef.current.forEach((c) => c?.close?.());
        subscriptionsRef.current = [];

        const followsSet = new Set(user?.follows);
        const filteredAuthors = Array.from(webOfTrust)

        setLoadingMore(true);
        const chunks = chunkArray(filteredAuthors, CHUNK_SIZE);
        let completedChunks = 0;

        chunks.forEach((chunk) => {
            const filter: Filter = { kinds: [1], authors: chunk, limit: 20 };

            const closer = pool.subscribeMany(relays, [filter], {
                onevent: (event) => {
                    // Before initial load complete, add to main notes
                    // After initial load, add to newNotes
                    const targetSetter = initialLoadComplete ? setNewNotes : setNotes;
                    targetSetter((prev) => {
                        const updated = new Map(prev);
                        const existing = updated.get(event.id);
                        if (!existing || existing.created_at < event.created_at) {
                            updated.set(event.id, event);
                        }
                        return updated;
                    });
                },
                oneose: () => {
                    completedChunks++;
                    if (completedChunks === chunks.length) {
                        setLoadingMore(false);
                        setInitialLoadComplete(true);
                    }
                    closer.close();
                },
            });

            subscriptionsRef.current.push(closer);
        });

        const timeout = setTimeout(() => {
            setLoadingMore(false);
            setInitialLoadComplete(true);
        }, LOAD_TIMEOUT_MS);

        return () => {
            clearTimeout(timeout);
            subscriptionsRef.current.forEach((c) => c?.close?.());
            subscriptionsRef.current = [];
        };
    }, [relays, user?.follows, initialLoadComplete]);

    return { notes, newNotes, loadingMore, fetchNotes, mergeNewNotes };
};
