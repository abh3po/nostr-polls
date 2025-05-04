// components/UserMenu.tsx
import React from "react";
import { Avatar, Menu, MenuItem } from "@mui/material";
import { useUserContext } from "../../hooks/useUserContext";
import {
  removeAppSecretFromLocalStorage,
  removeBunkerUriFromLocalStorage,
  removeKeysFromLocalStorage,
} from "../../utils/localStorage";
import { RelayModal } from "./RelayModal";
import { ColorSchemeToggle } from "../ColorScheme";
import { styled } from "@mui/system";
import { LoginModal } from "../Login/LoginModal";

const ListItem = styled("li")(() => ({
  padding: "0 16px",
}));

export const UserMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [showRelays, setShowRelays] = React.useState(false);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const { user, setUser } = useUserContext();

  const handleLogOut = () => {
    removeKeysFromLocalStorage();
    removeBunkerUriFromLocalStorage();
    removeAppSecretFromLocalStorage();
    setUser(null);
    setAnchorEl(null);
  };

  return (
    <div style={{ marginLeft: 10 }}>
      <Avatar src={user?.picture} onClick={(e) => setAnchorEl(e.currentTarget)}>
        {!user?.picture && user?.name?.[0]}
      </Avatar>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {user ? (
          <>
            <MenuItem onClick={() => setShowRelays(true)}>Your Relays</MenuItem>
            <MenuItem onClick={handleLogOut}>Log Out</MenuItem>
            <ListItem>
              <ColorSchemeToggle />
            </ListItem>
          </>
        ) : (
          <>
            <MenuItem onClick={() => setShowLoginModal(true)}>Log In</MenuItem>
            <ListItem>
              <ColorSchemeToggle />
            </ListItem>
          </>
        )}
      </Menu>
      <RelayModal
        showRelays={showRelays}
        onClose={() => setShowRelays(false)}
      />
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
};
