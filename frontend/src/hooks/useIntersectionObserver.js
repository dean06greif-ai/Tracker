import { useEffect, useState, useRef } from "react";

/**
 * Custom Hook für Intersection Observer
 * Extrahiert aus UserCard.jsx um Complexity zu reduzieren
 */
export function useIntersectionObserver({
  ref,
  onIntersect,
  threshold = 0.35,
  enabled = true,
}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const hasIntersectedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const element = ref.current;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        setIsIntersecting(entry.isIntersecting);

        if (entry.isIntersecting && !hasIntersectedRef.current) {
          hasIntersectedRef.current = true;
          if (onIntersect) {
            onIntersect();
          }
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, onIntersect, threshold, enabled]);

  return { isIntersecting, hasIntersected: hasIntersectedRef.current };
}