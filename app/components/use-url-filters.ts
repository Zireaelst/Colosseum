"use client";

import { useEffect, useState } from "react";
import { replaceFilterQuery } from "../../src/ui/history-filters";

/** Call with a stable defaults object declared outside the component. */
export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const [filters, setFilters] = useState<T>(defaults);
  useEffect(() => {
    const restore = () => {
      const params = new URL(window.location.href).searchParams;
      setFilters(Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, params.get(key) ?? fallback])) as T);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [defaults]);

  function update(changes: Partial<T>) {
    const values = changes as Record<string, string>;
    setFilters(current => ({ ...current, ...values }));
    const url = replaceFilterQuery(window.location.href, values, defaults);
    window.history.replaceState(window.history.state, "", url);
  }
  return [filters, update] as const;
}
