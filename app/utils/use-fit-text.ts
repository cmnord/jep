import { useCallback, useLayoutEffect, useRef, useState } from "react";

export default function useFitText<T extends HTMLElement = HTMLElement>({
  minFontSize = 4,
  maxFontSize = 200,
}: { minFontSize?: number; maxFontSize?: number } = {}) {
  const [fontSize, setFontSize] = useState<string | undefined>(undefined);
  const ref = useRef<T>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const fit = useCallback(
    (el: HTMLElement) => {
      let lo = minFontSize;
      let hi = maxFontSize;
      while (hi - lo > 0.5) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        if (
          el.scrollHeight > el.clientHeight ||
          el.scrollWidth > el.clientWidth
        ) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      const result = `${lo}px`;
      el.style.fontSize = result;
      setFontSize(result);
    },
    [minFontSize, maxFontSize],
  );

  // useLayoutEffect blocks the browser from painting until it completes.
  // State updates inside it trigger a synchronous re-render before paint.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    fit(el);

    // Observe the parent rather than the node itself. Changing the node's
    // fontSize changes its dimensions, which would re-trigger the observer
    // and cause a "ResizeObserver loop" warning. The parent's size reflects
    // the available space, which is what we actually want to refit on.
    const target = el.parentElement ?? el;
    const observer = new ResizeObserver(() => fit(el));
    observer.observe(target);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [fit]);

  return { ref, fontSize };
}
