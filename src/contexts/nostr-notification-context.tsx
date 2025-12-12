import {
  ReactNode,
  createContext,
  useEffect,
  useState,
  useRef,
  useContext,
} from "react";
import { Event, Filter } from "nostr-tools";
import { pool } from "../singletons";
import { useRelays } from "../hooks/useRelays";
import { useUserContext } from "../hooks/useUserContext";

const NOTIF_STORAGE_KEY_PREFIX = `pollerama:notifications:lastSeen`;
const DEFAULT_LOOKBACK_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

interface NotificationsContextInterface {
  notifications: Map<string, Event>;
  unreadCount: number;

  markAllAsRead: () => void;
  markAsRead: (id: string) => void;

  lastSeen: number | null;
}

export const NostrNotificationsContext =
  createContext<NotificationsContextInterface | null>(null);

export function NostrNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useUserContext();
  const { relays } = useRelays();

  const hasStarted = useRef(false);
  const [notifications, setNotifications] = useState<Map<string, Event>>(
    new Map()
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeen, setLastSeen] = useState<number | null>(null);

  const pollIds = useRef<Set<string>>(new Set());

  //
  // ────────────────────────────────────────────────────────────
  // load/save lastSeen
  // ────────────────────────────────────────────────────────────
  //
  const loadLastSeen = (pubkey: string) => {
    const stored = localStorage.getItem(
      `${NOTIF_STORAGE_KEY_PREFIX}:${pubkey}`
    );
    if (stored) {
      const n = Number(stored);
      return isNaN(n) ? null : n;
    }
    return null;
  };

  const saveLastSeen = (pubkey: string, ts: number) => {
    localStorage.setItem(
      `${NOTIF_STORAGE_KEY_PREFIX}:${pubkey}`,
      ts.toString()
    );
  };

  //
  // ────────────────────────────────────────────────────────────
  // Add notification
  // ────────────────────────────────────────────────────────────
  //
  const pushNotification = (event: Event) => {
    setNotifications((prev) => {
      if (prev.has(event.id)) return prev;
      const next = new Map(prev);
      next.set(event.id, event);
      return next;
    });

    if (!lastSeen || event.created_at > lastSeen) {
      setUnreadCount((c) => c + 1);
    }
  };

  //
  // ────────────────────────────────────────────────────────────
  // Fetch my polls once on mount
  // ────────────────────────────────────────────────────────────
  //
  const fetchPollIds = async (pubkey: string): Promise<void> => {
    return new Promise((resolve) => {
      const filter: Filter = {
        kinds: [1068],
        authors: [pubkey],
        limit: 1000,
      };

      const sub = pool.subscribeMany(relays, [filter], {
        onevent: (event: Event) => {
          pollIds.current.add(event.id);
        },
        oneose: () => {
          sub.close();
          resolve();
        },
      });

      // timeout after 3 seconds
      setTimeout(() => {
        sub.close();
        resolve();
      }, 3000);
    });
  };

  //
  // ────────────────────────────────────────────────────────────
  // Build filters AFTER pollIds are known
  // ────────────────────────────────────────────────────────────
  //
  const buildFilters = (pubkey: string, since: number): Filter[] => {
    const pollIdArray = Array.from(pollIds.current);

    return [
      // poll responses
      {
        kinds: [1018],
        since,
        "#e": pollIdArray,
      },

      // notes that tag me
      {
        kinds: [1],
        since,
        "#p": [pubkey],
      },

      // reactions to me
      {
        kinds: [7],
        since,
        "#p": [pubkey],
      },

      // zaps to me
      {
        kinds: [9735],
        since,
        "#p": [pubkey],
      },
    ];
  };

  //
  // ────────────────────────────────────────────────────────────
  // Main subscription
  // ────────────────────────────────────────────────────────────
  //
  useEffect(() => {
    if (!user?.pubkey) return;
    if (!relays || relays.length === 0) return;
    if (!pool) return;
    if (hasStarted.current) return;

    hasStarted.current = true;

    (async () => {
      // 1. load last seen
      const stored = loadLastSeen(user.pubkey);
      const since =
        stored ?? Math.floor((Date.now() - DEFAULT_LOOKBACK_MS) / 1000);

      setLastSeen(stored);

      // 2. fetch pollIds
      await fetchPollIds(user.pubkey);

      // 3. subscribe only after pollIds exist
      const filters = buildFilters(user.pubkey, since);

      const sub = pool.subscribeMany(relays, filters, {
        onevent: (event: Event) => {
          pushNotification(event);
        },
      });

      // DO NOT CLOSE the subscription (per your requirement)
    })();
  }, [user, relays]);

  //
  // ────────────────────────────────────────────────────────────
  // Mark read logic
  // ────────────────────────────────────────────────────────────
  //
  const markAllAsRead = () => {
    if (!user) return;
    const ts = Math.floor(Date.now() / 1000);
    setLastSeen(ts);
    saveLastSeen(user.pubkey, ts);
    setUnreadCount(0);
  };

  const markAsRead = (id: string) => {
    if (!user) return;

    const event = notifications.get(id);
    if (!event) return;

    if (lastSeen && event.created_at <= lastSeen) return;

    const nextLastSeen = event.created_at;
    setLastSeen(nextLastSeen);
    saveLastSeen(user.pubkey, nextLastSeen);

    const unread = Array.from(notifications.values()).filter(
      (ev) => ev.created_at > nextLastSeen
    ).length;

    setUnreadCount(unread);
  };

  return (
    <NostrNotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllAsRead,
        markAsRead,
        lastSeen,
      }}
    >
      {children}
    </NostrNotificationsContext.Provider>
  );
}

export const useNostrNotifications = () =>
  useContext(NostrNotificationsContext)!;
