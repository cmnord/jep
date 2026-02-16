import * as React from "react";
import { useFetcher } from "react-router";

/**
 * useInfiniteScroll manages paginated data loading with IntersectionObserver.
 * It handles the fetcher, page state, item accumulation, and observer lifecycle.
 *
 * Returns a `sentinelRef` that must be attached to a `<div>` rendered when
 * `shouldLoadMore` is true:
 *
 *     {shouldLoadMore && <div ref={sentinelRef} />}
 */
export default function useInfiniteScroll<TData, TItem>(
  initialItems: TItem[],
  options: {
    /** Build the fetch URL for the given page number. */
    getUrl: (page: number) => string;
    /** Extract the items array from the fetcher's response data. */
    getItems: (data: TData) => TItem[];
  },
) {
  const fetcher = useFetcher();
  const [items, setItems] = React.useState(initialItems);
  const [page, setPage] = React.useState(2);
  const [shouldLoadMore, setShouldLoadMore] = React.useState(true);

  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;
  const getUrlRef = React.useRef(options.getUrl);
  getUrlRef.current = options.getUrl;
  const getItemsRef = React.useRef(options.getItems);
  getItemsRef.current = options.getItems;

  // Observe the sentinel element. When it enters the viewport, load the next
  // page. The sentinel is conditionally rendered by the consumer so that
  // mounting it after new data arrives re-triggers the observer.
  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !shouldLoadMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetcherRef.current.load(getUrlRef.current(page));
          setShouldLoadMore(false);
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [shouldLoadMore, page]);

  // Append new items when the fetcher returns data.
  React.useEffect(() => {
    if (!fetcher.data) return;
    const newItems = getItemsRef.current(fetcher.data as TData);
    if (newItems.length === 0) {
      setShouldLoadMore(false);
      return;
    }
    setItems((prev) => [...prev, ...newItems]);
    setPage((prev) => prev + 1);
    setShouldLoadMore(true);
  }, [fetcher.data]);

  // Reset when the initial data changes (e.g. after a search navigation).
  React.useEffect(() => {
    setItems(initialItems);
    setPage(2);
    setShouldLoadMore(true);
  }, [initialItems]);

  return {
    items,
    sentinelRef,
    shouldLoadMore,
    isLoading: fetcher.state === "loading",
  };
}
