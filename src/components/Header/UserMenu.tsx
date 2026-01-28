import React from "react";
import { Avatar, Badge, Menu, MenuItem, Tooltip } from "@mui/material";
import { useUserContext } from "../../hooks/useUserContext";
import { ColorSchemeToggle } from "../ColorScheme";
import { styled } from "@mui/system";
import { LoginModal } from "../Login/LoginModal";
import { SettingsModal } from "./SettingsModal";
import { ContactsModal } from "./ContactsModal";
import { signerManager } from "../../singletons/Signer/SignerManager";
import { WarningAmber } from "@mui/icons-material";
import { ViewKeysModal } from "../User/ViewKeysModal";
import { useNavigate } from "react-router-dom";
import { nip19 } from "nostr-tools";

const ListItem = styled("li")(() => ({
  padding: "0 16px",
}));

export const UserMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showKeysModal, setShowKeysModal] = React.useState(false);
  const [showContactsModal, setShowContactsModal] = React.useState(false);
  const { user } = useUserContext();
  const navigate = useNavigate();

  const handleLogOut = () => {
    signerManager.logout();
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    if (user?.pubkey) {
      const npub = nip19.npubEncode(user.pubkey);
      navigate(`/profile/${npub}`);
      setAnchorEl(null);
    }
  };

  const handleContactsClick = () => {
    setShowContactsModal(true);
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
              <MenuItem key="profile" onClick={handleProfileClick}>
                Profile
              </MenuItem>,
              <MenuItem key="contacts" onClick={handleContactsClick}>
                Contacts
              </MenuItem>,
              user?.privateKey && (
                <MenuItem
                  key="view-keys"
                  onClick={() => {
                    setShowKeysModal(true);
                    setAnchorEl(null);
                  }}
                >
                  View Keys
                </MenuItem>
              ),

              <MenuItem key="settings" onClick={() => setShowSettings(true)}>
                Settings
              </MenuItem>,
              <MenuItem key="logout" onClick={handleLogOut}>Log Out</MenuItem>,
              <ListItem key="color-scheme">
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
              <MenuItem key="login" onClick={() => setShowLoginModal(true)}>
                Log In
              </MenuItem>,
              <ListItem key="color-scheme">
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
      <ViewKeysModal
        open={showKeysModal}
        onClose={() => setShowKeysModal(false)}
        pubkey={user?.pubkey || ""}
        privkey={user?.privateKey || ""}
      />
      <ContactsModal
        open={showContactsModal}
        onClose={() => setShowContactsModal(false)}
      />
    </div>
  );
};
