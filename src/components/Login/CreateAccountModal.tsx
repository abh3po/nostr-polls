// components/Login/CreateAccountModal.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Avatar,
  Stack,
  Typography,
  Alert,
  Box,
} from "@mui/material";
import { signerManager } from "../../singletons/Signer/SignerManager";
import { useUserContext } from "../../hooks/useUserContext";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils";
import { useNotification } from "../../contexts/notification-context";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const CreateAccountModal: React.FC<Props> = ({ open, onClose }) => {
  const [name, setName] = useState("");
  const [picture, setPicture] = useState("");
  const [about, setAbout] = useState("");
  const [keysVisible, setKeysVisible] = useState(false);
  const [pubkey, setPubkey] = useState("");
  const [privkey, setPrivkey] = useState("");

  const { setUser } = useUserContext();

  const handleCreateAccount = async () => {
    try {
      let secret = generateSecretKey();
      const keys = { secret: bytesToHex(secret), pubkey: getPublicKey(secret) };
      await signerManager.createGuestAccount(keys?.secret, {
        name,
        picture,
        about,
      });
      setPubkey(keys?.pubkey || "");
      setPrivkey(keys?.secret || "");
      setUser(signerManager.getUser());
      setKeysVisible(true);
    } catch (e) {
      console.error("Failed to create guest account", e);
      alert("Something went wrong.");
    }
  };

  const handleSkip = async () => {
    let secret = generateSecretKey();
    const keys = { secret: bytesToHex(secret), pubkey: getPublicKey(secret) };
    await signerManager.createGuestAccount(keys.secret, {
      name,
      picture,
      about,
    });
    setPubkey(keys?.pubkey || "");
    setPrivkey(keys?.secret || "");
    setUser(signerManager.getUser());
    setKeysVisible(true);
  };

  const handleClose = () => {
    setName("");
    setPicture("");
    setAbout("");
    setKeysVisible(false);
    setPubkey("");
    setPrivkey("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Create Guest Account</DialogTitle>
      <DialogContent>
        {keysVisible ? (
          <Box mt={2}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              These keys are stored <strong>insecurely</strong> in your browser.
              Back them up or import them into a NIP-07 extension or remote
              signer. If you lose them, your account is gone forever.
            </Alert>

            <Stack spacing={2}>
              {/* Public Key */}
              <Box>
                <Typography variant="subtitle2">Public Key (npub)</Typography>
                <MonospaceDisplay value={nip19.npubEncode(pubkey)} />
              </Box>

              {/* Private Key */}
              <Box>
                <Typography variant="subtitle2">Private Key (nsec)</Typography>
                <MonospaceDisplay
                  value={nip19.nsecEncode(hexToBytes(privkey))}
                />
              </Box>
            </Stack>
          </Box>
        ) : (
          <>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Display Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
              />
              <TextField
                label="Image URL"
                value={picture}
                onChange={(e) => setPicture(e.target.value)}
                fullWidth
              />
              <TextField
                label="About (optional description)"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Preview
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={picture} sx={{ width: 56, height: 56 }}>
                    {!picture && name ? name[0] : "?"}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1">
                      {name || "Anonymous"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {about || "No description provided."}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {keysVisible ? (
          <Button onClick={handleClose} variant="contained">
            Done
          </Button>
        ) : (
          <>
            <Button onClick={handleSkip}>Skip</Button>
            <Button onClick={handleCreateAccount} variant="contained">
              Continue
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

const MonospaceDisplay: React.FC<{ value: string }> = ({ value }) => {
  let notification = useNotification();
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    notification.showNotification("Copied to clipboard!");
  };

  return (
    <Box
      sx={{
        borderRadius: 1,
        px: 2,
        py: 1,
        fontFamily: "monospace",
        wordBreak: "break-all",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Box sx={{ flex: 1 }}>{value}</Box>
      <Button size="small" onClick={handleCopy}>
        Copy
      </Button>
    </Box>
  );
};
