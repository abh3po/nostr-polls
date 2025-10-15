import { createContext, ReactNode, useEffect, useState } from "react";
import { LoginModal } from "../components/Login/LoginModal";
import { signerManager } from "../singletons/Signer/SignerManager";

export type User = {
  name?: string;
  picture?: string;
  pubkey: string;
  privateKey?: string;
  follows?: string[];
  webOfTrust?: Set<string>;
  about?: string;
};

interface UserContextInterface {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  requestLogin: () => void;
}

export const ANONYMOUS_USER_NAME = "Anon...";

export const UserContext = createContext<UserContextInterface | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  useEffect(() => {
    if (!user) {
      console.log("ATTEMPTING RESTORE FROM LOCAL STORAGE");
      signerManager.restoreFromStorage();
    }
  }, []);
  useEffect(() => {
    signerManager.registerLoginModal(() => {
      return new Promise<void>((resolve) => {
        setLoginModalOpen(true);
      });
    });
    signerManager.onChange(async () => {
      setUser(await signerManager.getUser());
    });
  }, []);

  const requestLogin = () => {
    setLoginModalOpen(true);
  };

  return (
    <UserContext.Provider value={{ user, setUser, requestLogin }}>
      {children}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </UserContext.Provider>
  );
}
