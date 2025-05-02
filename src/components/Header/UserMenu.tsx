// UserMenu.tsx
import React from "react";
import { Avatar, Menu, MenuItem } from "@mui/material";
import {
  removeKeysFromLocalStorage,
  setKeysInLocalStorage,
} from "../../utils/localStorage";
import { fetchUserProfile } from "../../nostr";
import { Event } from "nostr-tools/lib/types/core";
import { useAppContext } from "../../hooks/useAppContext";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import { RelayModal } from "./RelayModal";
import { useUserContext } from "../../hooks/useUserContext";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex } from "@noble/hashes/utils";
import { ANONYMOUS_USER_NAME } from "../../contexts/user-context";
import { ColorSchemeToggle } from "../ColorScheme";
import { styled } from "@mui/system";

const ListItem = styled("li")(() => ({
  padding: "0 16px",
}));

const UserMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [showRelays, setShowRelays] = React.useState<boolean>(false);
  const { poolRef, addEventToProfiles } = useAppContext();
  const { user, setUser } = useUserContext();

  const handleTempId = async () => {
    const secret = generateSecretKey();
    const pubkey = getPublicKey(secret);
    setUser({
      name: ANONYMOUS_USER_NAME,
      picture: DEFAULT_IMAGE_URL,
      pubkey: pubkey,
      privateKey: bytesToHex(secret),
    });
    setKeysInLocalStorage(pubkey, bytesToHex(secret));
  };

  const handleLogin = async () => {
    if (window?.nostr) {
      try {
        // Get public key from NIP-07 signer extension
        const pubkey = await window.nostr.getPublicKey();
        // Save public key to local storage
        setKeysInLocalStorage(pubkey);
        fetchUserProfile(pubkey, poolRef.current).then(
          (kind0: Event | null) => {
            if (!kind0) {
              setUser({
                name: ANONYMOUS_USER_NAME,
                picture: DEFAULT_IMAGE_URL,
                pubkey,
              });
              return;
            }
            let profile = JSON.parse(kind0.content);
            setUser({ name: profile.name, picture: profile.picture, pubkey });
            addEventToProfiles(kind0);
          }
        );
        setAnchorEl(null);
      } catch (error) {
        console.error("Error while logging in:", error);
      }
    } else {
      alert(
        "No NIP-07 compatible signer extension found. Please install one and try again."
      );
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRelays = () => {
    setShowRelays(true);
  };

  const handleLogOut = () => {
    removeKeysFromLocalStorage(); // Remove pubkey from local storage on logout
    setUser(null); // Clear user state
    setAnchorEl(null);
  };

  return (
    <div style={{ marginLeft: 10 }}>
      {user ? (
        <Avatar src={user.picture} onClick={handleMenuOpen}>
          {!user.picture && user.name?.[0]}
        </Avatar>
      ) : (
        <Avatar onClick={handleMenuOpen}></Avatar>
      )}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {user ? (
          <div>
            <MenuItem onClick={handleRelays}>Your Relays</MenuItem>
            <MenuItem onClick={handleLogOut}>Log Out</MenuItem>
            <ListItem>
              <ColorSchemeToggle />
            </ListItem>
          </div>
        ) : (
          <div>
            <MenuItem onClick={handleLogin}>Log In Via Extension</MenuItem>
            <MenuItem onClick={handleTempId}>Use Temp Id</MenuItem>
            <ListItem>
              <ColorSchemeToggle />
            </ListItem>
          </div>
        )}
      </Menu>
      <RelayModal
        showRelays={showRelays}
        onClose={() => {
          setShowRelays(false);
        }}
      />
    </div>
  );
};

export default UserMenu;
