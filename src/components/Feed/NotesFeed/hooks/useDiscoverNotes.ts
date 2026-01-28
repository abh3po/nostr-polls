import { useState, useRef, useCallback } from "react";
import { nostrRuntime } from "../../../../singletons";
import { useRelays } from "../../../../hooks/useRelays";
import { Filter } from "nostr-tools/lib/types";
import { useUserContext } from "../../../../hooks/useUserContext";

const LOAD_TIMEOUT_MS = 5000;

export const useDiscoverNotes = () => {
    const { relays } = useRelays();
    const { user } = useUserContext();
    const [version, setVersion] = useState(0);
    const [newNotesVersion, setNewNotesVersion] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const subscriptionHandleRef = useRef<any>(null);
    const fetchedRef = useRef(false);

    // Query runtime for notes
    const notes = useCallback(() => {
        const events = nostrRuntime.query({ kinds: [1] });
        const noteMap = new Map<string, any>();
        for (const event of events) {
            noteMap.set(event.id, event);
        }
        return noteMap;
    }, [version]);

    // New notes buffer (before merge)
    const newNotes = useCallback(() => {
        // In the new architecture, we don't need a separate buffer
        // since runtime handles all storage
        // Return empty map for compatibility
        return new Map<string, any>();
    }, [newNotesVersion]);

    const mergeNewNotes = useCallback(() => {
        // No-op in new architecture since runtime stores everything together
        // Just trigger a re-render
        setVersion((v) => v + 1);
        setNewNotesVersion(0);
    }, []);

    const fetchNotes = useCallback((webOfTrust: Set<string>) => {
        if (!webOfTrust?.size || !relays?.length || fetchedRef.current) return;

        fetchedRef.current = true;

        // Close previous subscription if exists
        if (subscriptionHandleRef.current) {
            subscriptionHandleRef.current.unsubscribe();
        }

        const filteredAuthors = Array.from(webOfTrust);

        setLoadingMore(true);

        const filter: Filter = {
            kinds: [1],
            authors: filteredAuthors,
            limit: 20
        };

        // Runtime automatically chunks large author lists
        const handle = nostrRuntime.subscribe(relays, [filter], {
            onEvent: (event) => {
                // All events go to runtime automatically
                if (initialLoadComplete) {
                    setNewNotesVersion((v) => v + 1);
                } else {
                    setVersion((v) => v + 1);
                }
            },
            onEose: () => {
                setLoadingMore(false);
                setInitialLoadComplete(true);
                handle.unsubscribe();
            },
        });

        subscriptionHandleRef.current = handle;

        const timeout = setTimeout(() => {
            setLoadingMore(false);
            setInitialLoadComplete(true);
        }, LOAD_TIMEOUT_MS);

        return () => {
            clearTimeout(timeout);
            if (subscriptionHandleRef.current) {
                subscriptionHandleRef.current.unsubscribe();
            }
        };
    }, [relays, user?.follows, initialLoadComplete]);

    return {
        notes: notes(),
        newNotes: newNotes(),
        loadingMore,
        fetchNotes,
        mergeNewNotes
    };
};
