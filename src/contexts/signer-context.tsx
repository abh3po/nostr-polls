// contexts/signer-context.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { NostrSigner } from "../components/Signer/types"; // Adjust path
import { nip07Signer } from "../components/Signer/NIP07Signer";
import { createNip46Signer } from "../components/Signer/BunkerSigner";
import {
  getBunkerUriInLocalStorage,
  getKeysFromLocalStorage,
  setBunkerUriInLocalStorage,
  setKeysInLocalStorage,
} from "../utils/localStorage";
import { fetchUserProfile } from "../nostr";
import { Event } from "nostr-tools";
import { useAppContext } from "../hooks/useAppContext";
import { ANONYMOUS_USER_NAME } from "./user-context";
import { DEFAULT_IMAGE_URL } from "../utils/constants";
import { useUserContext } from "../hooks/useUserContext";
import { LoginModal } from "../components/Login/LoginModal";
import { useNotification } from "./notification-context";
import { NOTIFICATION_MESSAGES } from "../constants/notifications";

type SignerType = "nip07" | "nip46";

interface SignerContextType {
  signer: NostrSigner | null;
  type: SignerType | null;
  loginWithNip07: () => Promise<void>;
  loginWithNip46: (bunkerUri: string) => Promise<void>;
  requestLogin: () => void;
}

export const SignerContext = createContext<SignerContextType | null>(null);

export const SignerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [signer, setSigner] = useState<NostrSigner | null>(null);
  const [type, setType] = useState<SignerType | null>(null);
  const { poolRef, addEventToProfiles } = useAppContext();
  const { user, setUser } = useUserContext();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const { showNotification } = useNotification();

  const showLoginModal = () => setLoginModalOpen(true);

  const requestLogin = async () => {
    showLoginModal(); // instead of real login
  };

  useEffect(() => {
    // Fetch user profile when component mounts
    const initializeUser = async () => {
      if (user) return; // Skip if user is already set

      const keys = getKeysFromLocalStorage();
      const bunkerUri = getBunkerUriInLocalStorage();

      try {
        if (bunkerUri?.bunkerUri) {
          await loginWithNip46(bunkerUri.bunkerUri);
        } else if (keys.secret) {
          await loginWithNip07();
        } else if (keys.pubkey) {
          const kind0 = await fetchUserProfile(keys.pubkey, poolRef.current);
          if (kind0) {
            const profile = JSON.parse(kind0.content);
            setUser({
              ...profile,
              pubkey: keys.pubkey,
              picture: profile.picture || DEFAULT_IMAGE_URL,
              name: profile.name || ANONYMOUS_USER_NAME,
            });
            addEventToProfiles(kind0);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
      }
    };

    initializeUser();
  }, [user]);

  const loginWithNip07 = async () => {
    try {
      if (!window.nostr) throw new Error("NIP-07 extension not found");
      setSigner(nip07Signer);
      const pubkey = await window.nostr!.getPublicKey();
      setKeysInLocalStorage(pubkey);
      const kind0: Event | null = await fetchUserProfile(
        pubkey,
        poolRef.current
      );

      const userData = kind0
        ? { ...JSON.parse(kind0.content), pubkey }
        : { name: ANONYMOUS_USER_NAME, picture: DEFAULT_IMAGE_URL, pubkey };

      setUser(userData);
      kind0 && addEventToProfiles(kind0);
      setType("nip07");
    } catch (err) {
      console.error("Failed to initialize NIP-07 signer", err);
      showNotification(NOTIFICATION_MESSAGES.NIP07_INIT_FAILED, "error");
    }
  };

  const loginWithNip46 = async (bunkerUri: string) => {
    try {
      const remoteSigner = await createNip46Signer(bunkerUri);
      const pubkey = await remoteSigner.getPublicKey();
      setKeysInLocalStorage(pubkey);
      const kind0: Event | null = await fetchUserProfile(
        pubkey,
        poolRef.current
      );
      const userData = kind0
        ? { ...JSON.parse(kind0.content), pubkey }
        : { name: ANONYMOUS_USER_NAME, picture: DEFAULT_IMAGE_URL, pubkey };

      setUser(userData);
      kind0 && addEventToProfiles(kind0);
      setBunkerUriInLocalStorage(bunkerUri);
      setSigner(remoteSigner);
      setType("nip46");
    } catch (err) {
      console.error("Failed to initialize NIP-46 signer", err);
      showNotification(NOTIFICATION_MESSAGES.NIP46_INIT_FAILED, "error");
    }
  };

  return (
    <SignerContext.Provider
      value={{ signer, type, loginWithNip07, loginWithNip46, requestLogin }}
    >
      {children}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </SignerContext.Provider>
  );
};

// Optional convenience hook
export const useSigner = () => {
  const context = useContext(SignerContext);
  if (!context) throw new Error("useSigner must be used within SignerProvider");
  return context;
};
