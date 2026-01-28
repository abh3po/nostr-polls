import { useEffect, useRef } from "react";
import type { VirtuosoHandle } from "react-virtuoso";

type Options = {
  smooth?: boolean;
  debounceMs?: number;
};

export default function useTopicExplorerScroll(
  containerRef: React.RefObject<HTMLElement | null>,
  virtuosoRef: React.RefObject<VirtuosoHandle | null>,
  scrollContainerRef: React.RefObject<HTMLElement | null>,
  options: Options = {}
) {
  const { smooth = true, debounceMs = 400 } = options;
  const lastActionRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const scroller = scrollContainerRef.current;
    if (!container || !scroller) return;

    const now = () => Date.now();

    const bringContainerToTop = () => {
      const containerOffsetTop = container.offsetTop;

      scroller.scrollTo({
        top: containerOffsetTop,
        behavior: smooth ? "smooth" : "auto",
      });
    };

    const onContainerWheel = (e: WheelEvent) => {
      // scroll down inside virtuoso -> bring container to top
      if (e.deltaY > 10) {
        const containerOffsetTop = container.offsetTop;
        const scrollerScrollTop = scroller.scrollTop;

        // if container is not already scrolled to top, bring it there
        if (scrollerScrollTop < containerOffsetTop) {
          bringContainerToTop();
        }
      }

      // scroll up inside virtuoso -> scroll outer container to top
      if (e.deltaY < -10) {
        if (now() - lastActionRef.current > debounceMs) {
          lastActionRef.current = now();
          scroller.scrollTo({
            top: 0,
            behavior: smooth ? "smooth" : "auto",
          });
        }
      }
    };

    let touchStartY = 0;
    const onContainerTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches?.[0]?.clientY ?? 0;
    };
    const onContainerTouchMove = (e: TouchEvent) => {
      const t = e.touches?.[0];
      if (!t) return;

      const delta = touchStartY - t.clientY; // positive when swiped up (scroll down)

      if (delta > 10) {
        const containerOffsetTop = container.offsetTop;
        const scrollerScrollTop = scroller.scrollTop;
        if (scrollerScrollTop < containerOffsetTop) {
          bringContainerToTop();
        }
      }

      const pullDown = t.clientY - touchStartY; // positive when swiped down (scroll up)
      if (pullDown > 10) {
        if (now() - lastActionRef.current > debounceMs) {
          lastActionRef.current = now();
          scroller.scrollTo({
            top: 0,
            behavior: smooth ? "smooth" : "auto",
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
  }, [containerRef, scrollContainerRef, smooth, debounceMs]);
}