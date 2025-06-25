import React from "react";
import { Popover, Typography } from "@mui/material";

export const TranslationPopover: React.FC<{
  translatedText: string | null;
  buttonRef: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}> = ({ translatedText, buttonRef, open, onClose }) => {
  const id = open ? "translation-popover" : undefined;

  return (
    <>
      <Popover
        id={id}
        open={open}
        anchorEl={buttonRef}
        onClose={onClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        PaperProps={{
          sx: { maxWidth: 400, maxHeight: 200, p: 2, overflow: "auto" },
        }}
      >
        <Typography sx={{ whiteSpace: "pre-wrap" }}>
          {translatedText}
        </Typography>
      </Popover>
    </>
  );
};
