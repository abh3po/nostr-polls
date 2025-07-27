import { createContext, ReactNode, useState } from "react";
import { LoginModal } from "../components/Login/LoginModal";

export type User = {
  name?: string;
  picture?: string;
  pubkey: string;
  privateKey?: string;
  follows?: string[];
};

interface UserContextInterface {
  user: User | null;
  setUser: (user: User | null) => void;
  requestLogin: () => void;
}

export const ANONYMOUS_USER_NAME = "Anon...";

export const UserContext = createContext<UserContextInterface | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);

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
