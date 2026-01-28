import { useState, useEffect, useRef } from 'react';
import { Event, Filter } from 'nostr-tools';
import { nostrRuntime } from '../singletons';

/**
 * Options for useNostrEvents hook
 */
export interface UseNostrEventsOptions {
  /** If false, subscription is paused */
  enabled?: boolean;
  /** If true, only query cache without creating network subscription */
  localOnly?: boolean;
  /** Sort order for events ('newest' or 'oldest') */
  sortOrder?: 'newest' | 'oldest';
}

/**
 * React hook for subscribing to Nostr events
 *
 * Features:
 * - Automatic subscription management (cleanup on unmount)
 * - Deduplication via nostrRuntime
 * - Loading state tracking
 * - Conditional subscription (enabled option)
 *
 * @param filters - Nostr filters to subscribe to
 * @param relays - Relay URLs to subscribe from
 * @param options - Hook options
 * @returns Object with events array and loading state
 *
 * @example
 * ```typescript
 * const { events, loading } = useNostrEvents(
 *   [{ kinds: [1], limit: 100 }],
 *   ['wss://relay.example.com'],
 *   { enabled: true }
 * );
 * ```
 */
export function useNostrEvents(
  filters: Filter[],
  relays: string[],
  options?: UseNostrEventsOptions
): {
  events: Event[];
  loading: boolean;
} {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    enabled = true,
    localOnly = false,
    sortOrder = 'newest',
  } = options || {};

  // Use refs to track filter/relay changes without causing re-renders
  const filtersRef = useRef<string>('');
  const relaysRef = useRef<string>('');

  useEffect(() => {
    // Serialize filters and relays for comparison
    const filtersStr = JSON.stringify(filters);
    const relaysStr = JSON.stringify(relays);

    // Check if filters or relays changed
    const filtersChanged = filtersStr !== filtersRef.current;
    const relaysChanged = relaysStr !== relaysRef.current;

    if (filtersChanged || relaysChanged) {
      filtersRef.current = filtersStr;
      relaysRef.current = relaysStr;

      // Reset state on filter/relay change
      setEvents([]);
      setLoading(true);
    }

    if (!enabled) {
      setLoading(false);
      return;
    }

    // Track events by ID to avoid duplicates
    const eventMap = new Map<string, Event>();

    const handle = nostrRuntime.subscribe(relays, filters, {
      onEvent: (event) => {
        eventMap.set(event.id, event);

        // Update state with deduplicated events
        const eventArray = Array.from(eventMap.values());

        // Sort events
        if (sortOrder === 'newest') {
          eventArray.sort((a, b) => b.created_at - a.created_at);
        } else {
          eventArray.sort((a, b) => a.created_at - b.created_at);
        }

        setEvents(eventArray);
      },
      onEose: () => {
        setLoading(false);
      },
      localOnly,
    });

    return () => {
      handle.unsubscribe();
    };
  }, [
    JSON.stringify(filters),
    JSON.stringify(relays),
    enabled,
    localOnly,
    sortOrder,
  ]);

  return { events, loading };
}

/**
 * Hook for subscribing to a single event by ID
 *
 * @param eventId - Event ID to fetch
 * @param relays - Relay URLs to fetch from
 * @returns Object with event and loading state
 */
export function useNostrEvent(
  eventId: string | undefined,
  relays: string[]
): {
  event: Event | undefined;
  loading: boolean;
} {
  const { events, loading } = useNostrEvents(
    eventId ? [{ ids: [eventId] }] : [],
    relays,
    { enabled: !!eventId }
  );

  return {
    event: events[0],
    loading,
  };
}
