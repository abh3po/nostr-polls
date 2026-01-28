import { Event, Filter, SimplePool } from 'nostr-tools';
import { EventStore } from './EventStore';
import { SubscriptionManager } from './SubscriptionManager';
import {
  SubscribeOptions,
  SubscriptionHandle,
  RuntimeStats,
  SubscriptionDebugInfo,
} from './types';

/**
 * NostrRuntime - Centralized Nostr subscription and event storage
 *
 * Main API for interacting with Nostr events in the application.
 * Provides:
 * - Centralized event storage with multi-index queries
 * - Automatic subscription deduplication
 * - Simple query interface for components
 * - Integration with existing SimplePool and Throttler systems
 *
 * Usage:
 * ```typescript
 * import { nostrRuntime } from './singletons';
 *
 * // Query cached events (synchronous, no network)
 * const profiles = nostrRuntime.query({ kinds: [0], authors: ['pubkey'] });
 *
 * // Subscribe to events (network + cache)
 * const handle = nostrRuntime.subscribe(
 *   ['wss://relay.example.com'],
 *   [{ kinds: [1], limit: 100 }],
 *   {
 *     onEvent: (event) => console.log('New event:', event),
 *     onEose: () => console.log('Subscription ready'),
 *   }
 * );
 *
 * // Clean up
 * handle.unsubscribe();
 * ```
 */
export class NostrRuntime {
  private pool: SimplePool;
  public eventStore: EventStore;
  private subscriptionManager: SubscriptionManager;

  constructor(pool: SimplePool) {
    this.pool = pool;
    this.eventStore = new EventStore();
    this.subscriptionManager = new SubscriptionManager(pool, this.eventStore);
  }

  /**
   * Query cached events (synchronous, no network)
   * Returns events matching the filter, sorted by created_at (newest first)
   *
   * @param filter - Nostr filter to match events
   * @returns Array of matching events
   */
  query(filter: Filter): Event[] {
    return this.eventStore.query(filter);
  }

  /**
   * Get a single event by ID (synchronous, cache only)
   *
   * @param id - Event ID
   * @returns Event if found, undefined otherwise
   */
  get(id: string): Event | undefined {
    return this.eventStore.getById(id);
  }

  /**
   * Subscribe to events (network + cache)
   *
   * Behavior:
   * 1. Immediately queries cache and calls onEvent for each cached event
   * 2. Creates network subscription (or reuses existing) for new events
   * 3. Calls onEvent for each new event received
   * 4. Calls onEose when subscription reaches end-of-stored-events
   *
   * Deduplication:
   * - If another subscription with identical filters + relays exists, reuses it
   * - Automatically manages reference counting and cleanup
   *
   * @param relays - Array of relay URLs
   * @param filters - Array of Nostr filters
   * @param options - Subscription options
   * @returns SubscriptionHandle with unsubscribe function
   */
  subscribe(
    relays: string[],
    filters: Filter[],
    options?: SubscribeOptions
  ): SubscriptionHandle {
    const { onEvent, onEose, localOnly } = options || {};

    // If localOnly, just query cache and return
    if (localOnly) {
      if (onEvent) {
        // Query cache for each filter
        for (const filter of filters) {
          const events = this.eventStore.query(filter);
          for (const event of events) {
            onEvent(event);
          }
        }
      }

      // Call onEose immediately
      if (onEose) {
        onEose();
      }

      // Return dummy handle
      return {
        id: 'local-only',
        unsubscribe: () => {}, // No-op
      };
    }

    // First, deliver cached events immediately
    if (onEvent) {
      for (const filter of filters) {
        const cachedEvents = this.eventStore.query(filter);
        for (const event of cachedEvents) {
          onEvent(event);
        }
      }
    }

    // Then create network subscription
    const { id, unsubscribe } = this.subscriptionManager.subscribe(
      relays,
      filters,
      onEvent,
      onEose
    );

    return { id, unsubscribe };
  }

  /**
   * Add an event directly to the store
   * Useful for events received outside the subscription system
   * (e.g., from Throttler, user actions, etc.)
   *
   * @param event - Event to add
   * @returns true if event was added, false if rejected/duplicate
   */
  addEvent(event: Event): boolean {
    return this.eventStore.addEvent(event);
  }

  /**
   * Batch add multiple events
   * More efficient than calling addEvent multiple times
   *
   * @param events - Events to add
   * @returns Number of events successfully added
   */
  addEvents(events: Event[]): number {
    let addedCount = 0;
    for (const event of events) {
      if (this.eventStore.addEvent(event)) {
        addedCount++;
      }
    }
    return addedCount;
  }

  /**
   * Debug interface for inspecting runtime state
   */
  debug = {
    /**
     * Get runtime statistics
     */
    getStats: (): RuntimeStats => {
      const storeStats = this.eventStore.getStats();
      const subscriptionCount = this.subscriptionManager.getActiveCount();

      // Estimate memory usage (rough approximation)
      const avgEventSize = 1000; // bytes
      const estimatedMemory = storeStats.totalEvents * avgEventSize;

      return {
        totalEvents: storeStats.totalEvents,
        eventsByKind: storeStats.eventsByKind,
        activeSubscriptions: subscriptionCount,
        totalAuthors: storeStats.totalAuthors,
        estimatedMemory,
      };
    },

    /**
     * List all active subscriptions
     */
    listSubscriptions: (): SubscriptionDebugInfo[] => {
      return this.subscriptionManager.listSubscriptions();
    },

    /**
     * Get all events of a specific kind
     */
    getEventsByKind: (kind: number): Event[] => {
      return this.eventStore.getEventsByKind(kind);
    },

    /**
     * Clear all events (use with caution!)
     */
    clearEvents: (): void => {
      this.eventStore.clear();
    },

    /**
     * Prune old events
     */
    pruneOldEvents: (maxAgeDays: number = 7): number => {
      return this.eventStore.pruneOldEvents(maxAgeDays);
    },
  };

  /**
   * Cleanup - close all subscriptions and clear store
   * Useful for testing or app shutdown
   */
  cleanup(): void {
    this.subscriptionManager.closeAll();
    this.eventStore.clear();
  }
}

/**
 * Create a NostrRuntime instance
 * Typically called once to create a singleton
 */
export function createNostrRuntime(pool: SimplePool): NostrRuntime {
  return new NostrRuntime(pool);
}

// Re-export types for convenience
export * from './types';
export { EventStore } from './EventStore';
export { SubscriptionManager } from './SubscriptionManager';
