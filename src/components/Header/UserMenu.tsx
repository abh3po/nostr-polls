import React from "react";
import { Avatar, Badge, Menu, MenuItem, Tooltip } from "@mui/material";
import { useUserContext } from "../../hooks/useUserContext";
import { ColorSchemeToggle } from "../ColorScheme";
import { styled } from "@mui/system";
import { LoginModal } from "../Login/LoginModal";
import { SettingsModal } from "./SettingsModal";
import { signerManager } from "../../singletons/Signer/SignerManager";
import { WarningAmber } from "@mui/icons-material";

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
      <Tooltip
        title={user?.privateKey ? "Guest key stored insecurely in browser" : ""}
      >
        <Badge
          color="warning"
          variant="standard"
          invisible={!user?.privateKey}
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          badgeContent={<WarningAmber fontSize="small" />}
        >
          <Avatar
            src={user?.picture}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ cursor: "pointer" }}
          >
            {!user?.picture && user?.name?.[0]}
          </Avatar>
        </Badge>
      </Tooltip>
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
              user?.privateKey && (
                <MenuItem
                  key="delete-keys"
                  onClick={() => {
                    const confirmed = window.confirm(
                      "Are you sure you want to delete your keys? This action is irreversible."
                    );
                    if (confirmed) {
                      localStorage.removeItem("pollerama:keys");
                      signerManager.logout();
                      window.location.reload();
                    }
                  }}
                  style={{ color: "red" }}
                >
                  Delete Keys
                </MenuItem>
              ),
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
