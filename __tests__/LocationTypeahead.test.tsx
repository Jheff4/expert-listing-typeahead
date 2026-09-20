import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LocationTypeahead from "@/components/LocationTypeahead";

type MockFeature = {
  properties: {
    osm_id: number;
    name: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode: string;
  };
  geometry: { coordinates: [number, number] };
};

function feature(name: string, extra: Partial<MockFeature["properties"]> = {}): MockFeature {
  return {
    properties: {
      osm_id: Math.floor(Math.random() * 1_000_000),
      name,
      state: "Lagos",
      country: "Nigeria",
      countrycode: "NG",
      ...extra,
    },
    geometry: { coordinates: [3.4, 6.5] },
  };
}

function jsonResponse(features: MockFeature[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ features }),
  } as Response;
}

// Simulates a real network call that (a) takes `delayMs` to resolve and
// (b) actually honours AbortSignal, the same way `fetch` does in a browser.
// Without (b) this test could pass for the wrong reason: it would only be
// checking which promise settles last, not that the component ever
// cancelled the stale request in the first place.
function delayedFetch(delayMs: number, features: MockFeature[], signal?: AbortSignal) {
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => resolve(jsonResponse(features)), delayMs);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

// These tests use real timers rather than fake ones. The debounce (350ms)
// and mocked network delays (50-300ms) are short enough to run for real in
// well under a second, and doing so avoids fake-timer/async interleaving
// bugs with user-event's own internal scheduling - the race condition this
// suite exists to catch is about *real* out-of-order resolution, so
// exercising it with real timers is arguably more honest anyway.

describe("LocationTypeahead", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it(
    "discards a slow, stale response in favour of the latest query's result",
    async () => {
      const user = userEvent.setup();

      const fetchMock = vi.fn((url: string, init?: RequestInit) => {
        const q = new URL(url).searchParams.get("q");
        if (q === "lek") {
          // "lek" is requested first but resolves slowest.
          return delayedFetch(300, [feature("Lekan Street")], init?.signal ?? undefined);
        }
        if (q === "lekki") {
          // "lekki" is requested second but resolves fastest.
          return delayedFetch(20, [feature("Lekki Phase 1")], init?.signal ?? undefined);
        }
        throw new Error(`Unexpected query: ${q}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<LocationTypeahead />);
      const input = screen.getByRole("searchbox");

      await user.type(input, "lek");
      await new Promise((r) => setTimeout(r, 360)); // let debounce fire the "lek" request

      await user.type(input, "ki");

      await waitFor(
        () => expect(screen.getByText("Lekki Phase 1")).toBeInTheDocument(),
        { timeout: 2000 }
      );
      expect(screen.queryByText("Lekan Street")).not.toBeInTheDocument();

      // Proves cancellation actually happened, not just that we ignored the result.
      const lekCall = fetchMock.mock.calls.find(([url]) => new URL(url as string).searchParams.get("q") === "lek");
      expect(lekCall?.[1]?.signal?.aborted).toBe(true);
    },
    5000
  );

  it("collapses rapid keystrokes into a single request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((_url: string) => Promise.resolve(jsonResponse([])));
    vi.stubGlobal("fetch", fetchMock);

    render(<LocationTypeahead />);
    await user.type(screen.getByRole("searchbox"), "ikeja");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(new URL(fetchMock.mock.calls[0][0] as string).searchParams.get("q")).toBe("ikeja");
  });

  it("shows the empty state for a query with no matches", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse([]))));

    render(<LocationTypeahead />);
    await user.type(screen.getByRole("searchbox"), "zzqq");

    await waitFor(() => expect(screen.getByText(/No matches for/)).toBeInTheDocument(), { timeout: 2000 });
  });

  it("shows the error state when the request fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 503, json: async () => ({ features: [] }) } as Response)));

    render(<LocationTypeahead />);
    await user.type(screen.getByRole("searchbox"), "lekki");

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/could not reach/i), { timeout: 2000 });
  });

  it("selects the highlighted option on Enter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse([feature("Ikeja GRA")])))
    );

    render(<LocationTypeahead onSelect={onSelect} />);
    const input = screen.getByRole("searchbox");
    await user.type(input, "ikeja");
    await waitFor(() => expect(screen.getByRole("option")).toBeInTheDocument(), { timeout: 2000 });

    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Ikeja GRA" }));
    expect(input).toHaveValue("Ikeja GRA");
  });

  it("expands a known local alias before querying and shows what it searched for", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(jsonResponse([feature("Ikeja City Mall")]))
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<LocationTypeahead />);
    // "ICM" isn't a name OpenStreetMap tags Ikeja City Mall with, so the
    // component swaps it for the canonical name before hitting Photon.
    await user.type(screen.getByRole("searchbox"), "ICM");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(new URL(fetchMock.mock.calls[0][0] as string).searchParams.get("q")).toBe(
      "Ikeja City Mall"
    );
    expect(screen.getByText(/Showing results for/)).toHaveTextContent("Ikeja City Mall");
  });
});
