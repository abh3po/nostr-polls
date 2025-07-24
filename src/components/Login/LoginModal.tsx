// components/LoginModal.tsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
} from "@mui/material";
import { signerManager } from "../Signer/SignerManager";
import { useUserContext } from "../../hooks/useUserContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<Props> = ({ open, onClose }) => {
  const { setUser } = useUserContext();
  const handleLoginWithNip07 = async () => {
    const unsubscribe = signerManager.onChange(async () => {
      setUser(await signerManager.getUser());
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
      setUser(await signerManager.getUser());
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
          <Button onClick={handleLoginWithNip07} variant="contained" fullWidth>
            Log In via Extension (NIP-07)
          </Button>
          <Button onClick={handleLoginWithNip46} variant="contained" fullWidth>
            Log In via Remote Signer (NIP-46)
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};
