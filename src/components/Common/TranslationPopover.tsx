import React from "react";
import { Popover, Typography } from "@mui/material";

export const TranslationPopover: React.FC<{
  translatedText: string | null;
  buttonRef: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}> = ({ translatedText, buttonRef, open, onClose }) => {
  const id = open ? "translation-popover" : undefined;

  // Prevent scroll propagation to background
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

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
          sx: {
            maxWidth: 400,
            maxHeight: 200,
            p: 2,
            overflow: "auto",
            overscrollBehavior: "contain", // Prevent scroll chaining
            touchAction: "pan-y", // Allow vertical scroll but prevent propagation
          },
          onWheel: handleWheel,
          onTouchMove: handleTouchMove,
        }}
      >
        <Typography sx={{ whiteSpace: "pre-wrap" }}>
          {translatedText}
        </Typography>
      </Popover>
    </>
  );
};
