import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  IconButton,
  InputAdornment,
  Typography,
  Alert,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { signerManager } from "../../singletons/Signer/SignerManager";
import { nip19 } from "nostr-tools";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const NsecLoginModal: React.FC<Props> = ({ open, onClose }) => {
  const [nsec, setNsec] = useState("");
  const [showNsec, setShowNsec] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValidNsec = (value: string) => {
    try {
      const decoded = nip19.decode(value);
      return decoded.type === "nsec";
    } catch {
      return false;
    }
  };

  const handleLogin = async () => {
    setError(null);

    if (!isValidNsec(nsec.trim())) {
      setError("Invalid nsec. It should start with nsec1…");
      return;
    }

    try {
      setLoading(true);
      await signerManager.loginWithNsec(nsec.trim());
      onClose();
    } catch (e) {
      console.error(e);
      setError("Failed to log in with nsec");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Log in with nsec</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="warning">
            Your <strong>nsec is your private key</strong>. It will be stored
            securely in your device’s keychain and never shared.
          </Alert>

          <Typography variant="body2" color="text.secondary">
            Paste your nsec below. Make sure you are on a trusted device.
          </Typography>

          <TextField
            label="nsec"
            placeholder="nsec1..."
            value={nsec}
            onChange={(e) => setNsec(e.target.value)}
            type={showNsec ? "text" : "password"}
            fullWidth
            autoFocus
            error={!!error}
            helperText={error || " "}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowNsec((v) => !v)} edge="end">
                    {showNsec ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleLogin}
          variant="contained"
          disabled={loading || !nsec}
        >
          {loading ? "Logging in…" : "Log In"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
