// hooks/useResizeObserver.ts
import { useEffect } from "react";

export const useResizeObserver = (
  ref: React.RefObject<HTMLElement>,
  callback: () => void
) => {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(callback);
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, callback]);
};
