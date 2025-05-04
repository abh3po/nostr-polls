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

  const showLoginModal = () => setLoginModalOpen(true);

  const requestLogin = async () => {
    showLoginModal(); // instead of real login
  };
  useEffect(() => {
    // Fetch user profile when component mounts
    const initializeUser = () => {
      const keys = getKeysFromLocalStorage();
      if (Object.keys(keys).length !== 0 && !user) {
        fetchUserProfile(keys.pubkey, poolRef.current).then(
          (kind0: Event | null) => {
            if (!kind0) {
              setUser({
                name: ANONYMOUS_USER_NAME,
                picture: DEFAULT_IMAGE_URL,
                pubkey: keys.pubkey,
                privateKey: keys.secret,
              });
              return;
            }
            let profile = JSON.parse(kind0.content);
            setUser({
              name: profile.name,
              picture: profile.picture,
              pubkey: keys.pubkey,
              privateKey: keys.secret,
              ...profile,
            });
            addEventToProfiles(kind0);
          }
        );
        return;
      }
      const bunkerUri = getBunkerUriInLocalStorage();
      if (Object.keys(bunkerUri).length !== 0 && !user) {
        loginWithNip46(bunkerUri.bunkerUri);
      } else {
        setUser(null);
      }
    };
    if (!user) initializeUser();
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
      alert("No NIP07 Extension found.");
    }
  };

  const loginWithNip46 = async (bunkerUri: string) => {
    try {
      const remoteSigner = await createNip46Signer(bunkerUri);
      const pubkey = await remoteSigner.getPublicKey();
      console.log("PUBKEY FROM REMOTE SIGNER IS", pubkey);
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
      alert("Error signing in with bunker");
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
