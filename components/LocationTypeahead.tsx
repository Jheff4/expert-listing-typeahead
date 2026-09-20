"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { searchLocations, type GeoResult } from "@/lib/geocode";
import { resolveLocalAlias } from "@/lib/aliases";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 350;

type Status = "idle" | "loading" | "error" | "empty" | "success";

export type LocationTypeaheadProps = {
  label?: string;
  labelClassName?: string;
  selectedTextClassName?: string;
  placeholder?: string;
  onSelect?: (result: GeoResult) => void;
};

export default function LocationTypeahead({
  label = "Search a location in Nigeria",
  labelClassName = "text-ink-700",
  selectedTextClassName = "text-brand-700",
  placeholder = "Location, address, or postcode",
  onSelect,
}: LocationTypeaheadProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const [expandedAlias, setExpandedAlias] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);

  // AbortController keyed per request is the guard against stale
  // responses: a fast-typing user fires several requests, the network can
  // resolve them out of order, and only the controller for the *current*
  // debounced value is allowed to commit its results to state. Every
  // earlier controller gets aborted, so a slow "lek" response can never
  // land after and overwrite the fresh "lekki" response. See WRITEUP.md
  // for why this was chosen over a sequence-number check.
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const inputId = useId();
  const listboxId = useId();

  useEffect(() => {
    abortRef.current?.abort();

    const trimmed = debouncedQuery.trim();
    if (trimmed.length < MIN_CHARS) {
      setStatus("idle");
      setResults([]);
      setExpandedAlias(null);
      return;
    }

    // A handful of Lagos-area colloquialisms ("ICM" for Ikeja City Mall)
    // aren't in OpenStreetMap as alt_name tags, so no geocoder built on
    // that data can resolve them from the abbreviation alone. This is a
    // small local lookup, not a smarter search: it swaps a known alias for
    // its canonical name before the request goes out. See lib/aliases.ts.
    const alias = resolveLocalAlias(trimmed);
    setExpandedAlias(alias);
    const searchTerm = alias ?? trimmed;

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");

    searchLocations(searchTerm, controller.signal)
      .then((data) => {
        setResults(data);
        setStatus(data.length === 0 ? "empty" : "success");
        setActiveIndex(data.length > 0 ? 0 : -1);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
        setResults([]);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  function commitSelection(result: GeoResult) {
    setSelected(result);
    setQuery(result.name);
    setIsOpen(false);
    setResults([]);
    setStatus("idle");
    setExpandedAlias(null);
    onSelect?.(result);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) {
      if (e.key === "ArrowDown" && results.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
        break;
      case "Enter":
        if (activeIndex >= 0) {
          e.preventDefault();
          commitSelection(results[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  }

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const showPanel =
    isOpen && (status === "loading" || status === "error" || status === "empty" || status === "success");

  return (
    <div className="w-full max-w-xl">
      <label
        htmlFor={inputId}
        className={`mb-2 block text-sm font-medium ${labelClassName}`}
      >
        {label}
      </label>

      <div className="relative" role="combobox" aria-haspopup="listbox" aria-owns={listboxId} aria-expanded={showPanel}>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="searchbox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelected(null);
          }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full truncate rounded-lg border border-ink-100 bg-white px-4 py-3 text-ink-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />

        {status === "loading" && (
          // A radar-style loader (an expanding, fading ping behind a
          // location pin) rather than a generic spinner - it reads as
          // "searching nearby locations" at a glance, which a plain spinner
          // doesn't communicate, and costs nothing extra: `animate-ping` is
          // a built-in Tailwind utility, no custom keyframes needed.
          <span
            className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center"
            aria-hidden="true"
          >
            <span className="absolute h-full w-full animate-ping rounded-full bg-brand-400/60" />
            <svg viewBox="0 0 24 24" className="relative h-3 w-3 text-brand-600" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.14 5 9.02 5 14.3 12 22 12 22s7-7.7 7-12.98C19 5.14 15.87 2 12 2Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
            </svg>
          </span>
        )}

        {showPanel && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Location suggestions"
            className="animate-panel-in absolute z-10 mt-2 max-h-72 w-full origin-top overflow-auto rounded-lg border border-ink-100 bg-white py-1 shadow-panel"
          >
            {expandedAlias && (status === "loading" || status === "success" || status === "empty") && (
              <li role="presentation" className="border-b border-ink-100 px-4 py-2 text-xs text-brand-700">
                Showing results for &ldquo;{expandedAlias}&rdquo;
              </li>
            )}

            {status === "loading" && (
              <li className="px-4 py-3 text-sm text-ink-500">Searching Nigerian locations...</li>
            )}

            {status === "error" && (
              <li className="px-4 py-3 text-sm text-red-600" role="alert">
                Could not reach the location service. Try again.
              </li>
            )}

            {status === "empty" && (
              <li className="px-4 py-3 text-sm text-ink-500">
                No matches for &ldquo;{debouncedQuery}&rdquo;.
              </li>
            )}

            {status === "success" &&
              results.map((result, index) => (
                <li
                  key={result.id}
                  id={`${listboxId}-option-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commitSelection(result);
                  }}
                  className={`cursor-pointer px-4 py-2.5 text-sm transition-colors duration-100 ${
                    index === activeIndex
                      ? "bg-brand-50 text-brand-800"
                      : "text-ink-900"
                  }`}
                >
                  <span className="block font-medium">{result.name}</span>
                  <span className="block truncate text-xs text-ink-500">
                    {result.detail}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>

      {selected && (
        <p className={`animate-panel-in mt-2 text-xs ${selectedTextClassName}`}>
          Selected: {selected.detail} ({selected.lat.toFixed(4)}, {selected.lon.toFixed(4)})
        </p>
      )}
    </div>
  );
}
