import { createContext, ReactNode, useEffect, useState } from "react";
import { defaultRelays } from "../nostr";
import { useUserContext } from "../hooks/useUserContext";
import { useAppContext } from "../hooks/useAppContext";

interface RelayContextInterface {
  relays: string[];
  isUsingUserRelays: boolean;
}

export const RelayContext = createContext<RelayContextInterface>({
  relays: defaultRelays,
  isUsingUserRelays: false,
});

export function RelayProvider({ children }: { children: ReactNode }) {
  const [relays, setRelays] = useState<string[]>(defaultRelays);
  const [isUsingUserRelays, setIsUsingUserRelays] = useState<boolean>(false);
  const { user } = useUserContext();
  const { poolRef } = useAppContext();

  useEffect(() => {
    // Reset to default relays when user logs out
    if (!user) {
      setRelays(defaultRelays);
      setIsUsingUserRelays(false);
      return;
    }

    // Fetch user's relay list when logged in
    const fetchUserRelays = async () => {
      try {
        const filters = { kinds: [10002], authors: [user.pubkey] };
        const results = await poolRef.current.querySync(defaultRelays, filters);
        
        if (results && results.length > 0) {
          const userRelays = results[0].tags
            .filter((tag) => tag[0] === "r")
            .map((tag) => tag[1]);
          
          if (userRelays.length > 0) {
            setRelays(userRelays);
            setIsUsingUserRelays(true);
            return;
          }
        }
        
        // Fallback to default relays if no user relays found
        setRelays(defaultRelays);
        setIsUsingUserRelays(false);
      } catch (error) {
        console.error("Error fetching user relays:", error);
        setRelays(defaultRelays);
        setIsUsingUserRelays(false);
      }
    };

    fetchUserRelays();
  }, [user, poolRef]);

  return (
    <RelayContext.Provider value={{ relays, isUsingUserRelays }}>
      {children}
    </RelayContext.Provider>
  );
}