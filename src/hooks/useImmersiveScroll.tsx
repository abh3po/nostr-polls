import { useEffect, useRef } from "react";
import type { VirtuosoHandle } from "react-virtuoso";

type Options = {
  outsideDownThreshold?: number;
  insideUpThreshold?: number;
  smooth?: boolean;
  debounceMs?: number;
};

export default function useImmersiveScroll(
  containerRef: React.RefObject<HTMLElement | null>,
  virtuosoRef: React.RefObject<VirtuosoHandle | null>,
  options: Options = {},
  scrollContainerRef?: React.RefObject<HTMLElement | null> // add optional param
) {
  const {
    outsideDownThreshold = 10,
    insideUpThreshold = 10,
    smooth = true,
    debounceMs = 400,
  } = options;
  const lastActionRef = useRef(0);

  useEffect(() => {
    if (!containerRef?.current) return;

    const now = () => Date.now();
    const tryScrollVirtuosoToTop = () => {
      const container = containerRef.current!;
      const scroller = container.querySelector<HTMLElement>(
        ".virtuoso-scroller, [data-virtuoso-scroller]"
      );
      if (smooth && scroller && "scrollTo" in scroller) {
        scroller.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        virtuosoRef?.current?.scrollToIndex?.({ index: 0, align: "start" });
      } catch {
        if (scroller) scroller.scrollTo({ top: 0 });
      }
    };

    const onWindowWheel = (e: WheelEvent) => {
      const target = e.target as Node | null;
      if (!containerRef.current) return;
      if (target && containerRef.current.contains(target)) return;
      if (e.deltaY > outsideDownThreshold) {
        if (now() - lastActionRef.current > debounceMs) {
          lastActionRef.current = now();
          tryScrollVirtuosoToTop();
        }
      }
    };

    let globalTouchStartY = 0;
    const onWindowTouchStart = (e: TouchEvent) => {
      globalTouchStartY = e.touches?.[0]?.clientY ?? 0;
    };
    const onWindowTouchMove = (e: TouchEvent) => {
      const t = e.touches?.[0];
      if (!t || !containerRef.current) return;
      const target = e.target as Node | null;
      if (target && containerRef.current.contains(target)) return;
      const delta = globalTouchStartY - t.clientY;
      if (delta > outsideDownThreshold) {
        if (now() - lastActionRef.current > debounceMs) {
          lastActionRef.current = now();
          tryScrollVirtuosoToTop();
        }
      }
    };

    window.addEventListener("wheel", onWindowWheel, { passive: true });
    window.addEventListener("touchstart", onWindowTouchStart, {
      passive: true,
    });
    window.addEventListener("touchmove", onWindowTouchMove, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWindowWheel);
      window.removeEventListener("touchstart", onWindowTouchStart);
      window.removeEventListener("touchmove", onWindowTouchMove);
    };
  }, [containerRef, virtuosoRef, outsideDownThreshold, smooth, debounceMs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const now = () => Date.now();

    const bringContainerToTop = () => {
      const rect = container.getBoundingClientRect();
      const scroller = scrollContainerRef?.current || window;
      const currentScroll = scrollContainerRef?.current
        ? scrollContainerRef.current.scrollTop
        : window.scrollY || 0;
      const target = currentScroll + rect.top;
      if (target > (window.scrollY || 0)) {
        window.scrollTo({
          top: target,
          behavior: smooth ? "smooth" : "auto",
        });
      }
    };

    const onContainerWheel = (e: WheelEvent) => {
      // scroll down inside list -> if window at top, bring the virtuoso container to the top of viewport
      if (e.deltaY > outsideDownThreshold) {
        const atTop = (window.scrollY || window.pageYOffset) < 1;
        if (atTop) {
          // bring container's top to viewport top (smooth)
          bringContainerToTop();
        }
      }

      // scroll up inside list -> scroll window to top (reveal header)
      if (e.deltaY < -insideUpThreshold) {
        if (now() - lastActionRef.current > (options.debounceMs ?? 400)) {
          lastActionRef.current = now();
          (scrollContainerRef?.current || window).scrollTo?.({
            top: 0,
            behavior: options.smooth ? "smooth" : "auto",
          });
        }
      }
    };

    let touchStartYInside = 0;
    const onContainerTouchStart = (e: TouchEvent) => {
      touchStartYInside = e.touches?.[0]?.clientY ?? 0;
    };
    const onContainerTouchMove = (e: TouchEvent) => {
      const t = e.touches?.[0];
      if (!t) return;

      const delta = touchStartYInside - t.clientY; // positive when user swiped up => list scrolls down

      // user swiped up inside list (scrolling list down) -> bring container to top if window at top
      if (delta > outsideDownThreshold) {
        const atTop = (window.scrollY || window.pageYOffset) < 1;
        if (atTop) {
          bringContainerToTop();
        }
      }

      // user swiped down inside list (scrolling list up) -> reveal header
      const pullDown = t.clientY - touchStartYInside; // positive when swiping down
      if (pullDown > insideUpThreshold) {
        if (now() - lastActionRef.current > (options.debounceMs ?? 400)) {
          lastActionRef.current = now();
          (scrollContainerRef?.current || window).scrollTo?.({
            top: 0,
            behavior: options.smooth ? "smooth" : "auto",
          });
        }
      }
    };

    container.addEventListener("wheel", onContainerWheel, { passive: true });
    container.addEventListener("touchstart", onContainerTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", onContainerTouchMove, {
      passive: true,
    });

    return () => {
      container.removeEventListener("wheel", onContainerWheel);
      container.removeEventListener("touchstart", onContainerTouchStart);
      container.removeEventListener("touchmove", onContainerTouchMove);
    };
  }, [
    containerRef,
    options.insideUpThreshold,
    options.smooth,
    options.debounceMs,
    outsideDownThreshold,
  ]);
}
