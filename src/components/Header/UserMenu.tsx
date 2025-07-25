import React from "react";
import { Avatar, Menu, MenuItem } from "@mui/material";
import { useUserContext } from "../../hooks/useUserContext";
import { ColorSchemeToggle } from "../ColorScheme";
import { styled } from "@mui/system";
import { LoginModal } from "../Login/LoginModal";
import { SettingsModal } from "./SettingsModal";
import { signerManager } from "../Signer/SignerManager";

const ListItem = styled("li")(() => ({
  padding: "0 16px",
}));

export const UserMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const { user } = useUserContext();

  const handleLogOut = () => {
    signerManager.logout();
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
        {user
          ? [
              <MenuItem onClick={() => setShowSettings(true)}>
                Settings
              </MenuItem>,
              <MenuItem onClick={handleLogOut}>Log Out</MenuItem>,
              <ListItem>
                <ColorSchemeToggle />
              </ListItem>,
            ]
          : [
              <MenuItem onClick={() => setShowLoginModal(true)}>
                Log In
              </MenuItem>,
              <ListItem>
                <ColorSchemeToggle />
              </ListItem>,
            ]}
      </Menu>
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
};
