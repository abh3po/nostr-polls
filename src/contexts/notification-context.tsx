import React, { createContext, useCallback, useContext, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

export type NotificationSeverity = "success" | "error" | "info" | "warning";

interface NotificationState {
  open: boolean;
  message: string;
  severity: NotificationSeverity;
  duration: number;
}

interface NotificationContextType {
  showNotification: (message: string, severity?: NotificationSeverity, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: "",
    severity: "success",
    duration: 4000,
  });

  const showNotification = useCallback((
    message: string, 
    severity: NotificationSeverity = "success",
    duration?: number
  ) => {
    const defaultDuration = severity === "error" ? 6000 : 4000;
    
    setNotification({
      open: true,
      message,
      severity,
      duration: duration || defaultDuration,
    });
  }, []);

  const handleClose = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        role="alert"
        aria-live="polite"
      >
        <Alert
          onClose={handleClose}
          severity={notification.severity}
          sx={{ width: "100%" }}
          aria-describedby="notification-message"
        >
          <span id="notification-message">{notification.message}</span>
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};
