import { useContext } from "react";
import { DMContext } from "../contexts/dm-context";

export function useDMContext() {
  const context = useContext(DMContext);

  if (!context) {
    throw new Error("useDMContext must be used within a DMProvider");
  }

  return context;
}
