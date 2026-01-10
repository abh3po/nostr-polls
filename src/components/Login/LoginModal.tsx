// components/LoginModal.tsx
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
} from "@mui/material";
import { signerManager } from "../../singletons/Signer/SignerManager";
import { useUserContext } from "../../hooks/useUserContext";
import { CreateAccountModal } from "./CreateAccountModal";
import { isAndroidNative, isNative } from "../../utils/platform";
import { NsecLoginModal } from "./NsecLoginModal";
import { NostrSignerPlugin } from "nostr-signer-capacitor-plugin";
import { SignerAppInfo } from "nostr-signer-capacitor-plugin/dist/esm/definitions";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<Props> = ({ open, onClose }) => {
  const { setUser } = useUserContext();
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showNsecLogin, setShowNsecLogin] = useState(false);
  const [installedSigners, setInstalledSigners] = useState<{
    apps: SignerAppInfo[];
  }>();

  useEffect(() => {
    const initialize = async () => {
      const installedSigners = await NostrSignerPlugin.getInstalledSignerApps();
      setInstalledSigners(installedSigners);
    };
    initialize();
  }, []);
  const handleLoginWithNip07 = async () => {
    const unsubscribe = signerManager.onChange(async () => {
      setUser(signerManager.getUser());
      unsubscribe();
    });
    try {
      await signerManager.loginWithNip07();
      onClose();
    } catch (err) {
      alert("NIP-07 login failed");
      console.error(err);
    }
  };

  const handleLoginWithNip46 = async () => {
    const unsubscribe = signerManager.onChange(async () => {
      setUser(signerManager.getUser());
      unsubscribe();
    });
    const bunkerUri = prompt("Enter your Bunker (NIP-46) URI:");
    if (!bunkerUri) return;

    try {
      await signerManager.loginWithNip46(bunkerUri);
      onClose();
    } catch (err) {
      alert("Failed to connect to remote signer.");
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Log In</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {isAndroidNative() && (
            <>
              {installedSigners?.apps.map((app) => {
                return (
                  <Button
                    onClick={() => {
                      signerManager.loginWithNip55(app.packageName);
                    }}
                    endIcon={<img src={app.iconUrl} height={18} width={18} />}
                    variant="contained"
                    fullWidth
                  >
                    Log In with {app.name}
                  </Button>
                );
              })}
            </>
          )}
          {!isNative && (
            <Button
              onClick={handleLoginWithNip07}
              variant="contained"
              fullWidth
            >
              Log In via Extension (NIP-07)
            </Button>
          )}

          {isNative && (
            <Button
              onClick={() => setShowNsecLogin(true)}
              variant="contained"
              fullWidth
            >
              Log In with nsec (Device)
            </Button>
          )}

          <Button onClick={handleLoginWithNip46} variant="contained" fullWidth>
            Log In via Remote Signer (NIP-46)
          </Button>
          <Button
            onClick={() => setShowCreateAccount(true)}
            variant="outlined"
            fullWidth
          >
            Create Guest Account
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
      <CreateAccountModal
        open={showCreateAccount}
        onClose={() => setShowCreateAccount(false)}
      />
      <NsecLoginModal
        open={showNsecLogin}
        onClose={() => setShowNsecLogin(false)}
      />
    </Dialog>
  );
};
