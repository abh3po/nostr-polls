import React, { useRef } from "react";
import { Box, CircularProgress, Fab } from "@mui/material";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import useImmersiveScroll from "../../hooks/useImmersiveScroll";
import useTopicExplorerScroll from "../../hooks/useTopicExplorerScroll";

interface UnifiedFeedProps<T> {
  // Data
  data: T[];
  itemContent: (index: number, item: T) => React.ReactNode;
  computeItemKey?: (index: number, item: T) => string | number;

  // Scroll mode (only one should be set)
  customScrollParent?: HTMLElement; // embedded (profile feeds)
  scrollContainerRef?: React.RefObject<HTMLElement | null>; // nested (topic explorer)
  // neither = immersive (default)

  // Pagination
  onEndReached?: () => void;
  onStartReached?: () => void;

  // Loading
  loading?: boolean; // full-page loader (replaces list)
  loadingMore?: boolean; // footer spinner

  // Empty state
  emptyState?: React.ReactNode;

  // New items FAB
  newItemCount?: number;
  onShowNewItems?: () => void;

  // Content above Virtuoso inside the scroll container
  headerContent?: React.ReactNode;

  // Virtuoso passthrough
  followOutput?: boolean;
  virtuosoRef?: React.RefObject<VirtuosoHandle | null>;
}

function UnifiedFeed<T>({
  data,
  itemContent,
  computeItemKey,
  customScrollParent,
  scrollContainerRef,
  onEndReached,
  onStartReached,
  loading,
  loadingMore,
  emptyState,
  newItemCount,
  onShowNewItems,
  headerContent,
  followOutput,
  virtuosoRef: externalVirtuosoRef,
}: UnifiedFeedProps<T>) {
  const internalVirtuosoRef = useRef<VirtuosoHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const virtuosoRef = (externalVirtuosoRef ?? internalVirtuosoRef) as React.RefObject<VirtuosoHandle>;

  const isEmbedded = !!customScrollParent;
  const isNested = !!scrollContainerRef;
  const isImmersive = !isEmbedded && !isNested;

  // Hooks are always called, but they no-op when their refs are null
  useImmersiveScroll(
    isImmersive ? containerRef : { current: null },
    isImmersive ? virtuosoRef : { current: null },
    { smooth: true },
  );

  useTopicExplorerScroll(
    isNested ? containerRef : { current: null },
    isNested ? virtuosoRef : { current: null },
    isNested ? scrollContainerRef! : { current: null },
  );

  // Only pass computeItemKey when provided — Virtuoso v4 calls it unconditionally,
  // so passing undefined overrides the internal default and crashes.
  const computeKeyProp = computeItemKey ? { computeItemKey } : {};

  const showLoading = loading && data.length === 0;
  const showEmpty = !loading && data.length === 0 && emptyState;

  // Embedded mode: no container div, no scroll hooks — early returns are safe.
  if (isEmbedded) {
    if (showLoading) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "200px",
          }}
        >
          <CircularProgress />
        </Box>
      );
    }
    if (showEmpty) {
      return <>{emptyState}</>;
    }
    return (
      <Virtuoso
        ref={virtuosoRef}
        data={data}
        itemContent={itemContent}
        {...computeKeyProp}
        customScrollParent={customScrollParent}
        endReached={onEndReached}
        startReached={onStartReached}
        followOutput={followOutput}
        components={{
          Footer: () =>
            loadingMore ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : null,
        }}
      />
    );
  }

  // Immersive or nested mode: the container div must ALWAYS mount so that
  // scroll hooks can attach their listeners to it.
  return (
    <>
      <div ref={containerRef} style={{ height: "100vh" }}>
        {headerContent}
        {showLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "200px",
            }}
          >
            <CircularProgress />
          </Box>
        ) : showEmpty ? (
          <>{emptyState}</>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={data}
            itemContent={itemContent}
            {...computeKeyProp}
            style={{ height: "100%" }}
            endReached={onEndReached}
            startReached={onStartReached}
            followOutput={followOutput}
            components={{
              Footer: () =>
                loadingMore ? (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", p: 2 }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                ) : null,
            }}
          />
        )}
      </div>

      {newItemCount != null && newItemCount > 0 && onShowNewItems && (
        <Fab
          color="primary"
          aria-label="new posts"
          onClick={onShowNewItems}
          sx={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <KeyboardArrowUpIcon /> See {newItemCount} new posts
        </Fab>
      )}
    </>
  );
}

export default UnifiedFeed;
