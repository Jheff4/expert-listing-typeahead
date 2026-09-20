import Link from "next/link";
import Logo from "@/components/Logo";
import LocationTypeahead from "@/components/LocationTypeahead";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="bg-night-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo className="text-brand-400 mt-1" />
          <Link
            href="/docs"
            className="group hidden items-center gap-1.5 text-sm font-medium text-brand-400 transition-colors hover:text-brand-300 sm:inline-flex"
          >
            Documentation
            <span
              aria-hidden="true"
              className="transition-transform duration-150 group-hover:translate-x-1"
            >
              &rarr;
            </span>
          </Link>
        </div>
      </header>

      {/* The floating card lives inside `main`, not as a sibling pulled up
          with a negative margin. A sibling straddling the hero/page seam
          shows whatever the *sibling's own* background is (transparent, so
          the page background) through its rounded top corners, which
          doesn't match the hero's dark background behind that seam - a
          visible mismatched wedge. As a child of `main`, its rounded
          corners reveal `main`'s own background where they're still over
          the hero, and the true page background only past the hero's edge,
          which is correct either way. */}
      <main className="relative isolate bg-night-900">
        <div className="absolute inset-0 overflow-hidden">
          {/* No real Expert Listing photography was supplied, and random
              keyword-matched stock photo APIs (tried loremflickr) returned
              irrelevant results - a skyline silhouette is a safer stand-in
              than gambling on an unrelated photo. Swap for real listing
              photography if this ships past the screening task. */}
          <Skyline className="absolute inset-x-0 bottom-0 h-2/3 w-full text-night-800" />
          <div
            className="absolute -top-24 left-1/4 h-[32rem] w-[32rem] rounded-full bg-brand-400/20 blur-[120px]"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-night-900 via-night-900/40 to-night-900" />
        </div>

        <div className="relative mx-auto flex max-w-5xl flex-col items-start px-6 pb-28 pt-20">
          <span className="animate-hero-in inline-block rounded-full bg-brand-400/15 px-3 py-1 text-xs font-medium text-brand-300 ring-1 ring-inset ring-brand-400/30">
            Frontend Engineer screening task
          </span>
          <h1 className="animate-hero-in animate-hero-in-delay-1 mt-4 max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
            A location search that never shows you a stale result
          </h1>
          <p className="animate-hero-in animate-hero-in-delay-2 mt-4 max-w-xl text-night-200">
            The <code className="text-brand-300">Location</code> field below is
            a fully working debounced typeahead over real Nigerian places, built
            the way this search bar would actually need to work in production.
          </p>
        </div>

        {/* Liquid-glass panel: translucent + blurred rather than a flat
            white card, so it reads as part of the dark/lime brand instead
            of a generic light-mode form dropped on top of it. The pill
            inputs inside stay near-opaque white so the actual text (what
            you're typing, the placeholder values) keeps full contrast. Kept
            fully inside the dark hero (not overlapping the light page below)
            since backdrop-blur has nothing dark left to blur past that
            edge, which washes out the translucent text on top of it. */}
        <div className="relative mx-auto w-full max-w-5xl px-6 pb-16">
          <div className="animate-hero-in animate-hero-in-delay-2 rounded-2xl border border-white/15 bg-white/10 p-5 shadow-panel backdrop-blur-xl sm:p-6">
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-start">
              <LocationTypeahead
                label="Location"
                labelClassName="text-white/80"
                selectedTextClassName="text-brand-300"
              />

              <Field label="Property Type" value="Any" />
              <Field label="Beds & Baths" value="Beds / Baths" />
              <Field label="Price" value="Price Range" />

              {/* Hidden below sm rather than kept and restyled: it's a
                  disabled, decorative button (this task only wires up
                  Location), and once the grid stacks to one column on
                  mobile it has no input to sit flush beside, so it just
                  floats as an orphaned circle under Price. The typeahead
                  already searches as you type, so there's nothing for an
                  explicit search action to do on any breakpoint; dropping
                  it on mobile removes dead chrome instead of dressing it
                  up. */}
              <div className="hidden sm:block">
                <span
                  className="invisible mb-2 block text-sm font-medium"
                  aria-hidden="true"
                >
                  Search
                </span>
                <button
                  type="button"
                  disabled
                  title="Visual only - this screening task scopes to the Location field"
                  className="flex h-[50px] w-[50px] shrink-0 scale-100 items-center justify-center rounded-full bg-brand-400 text-night-900 opacity-90 transition-transform duration-150 hover:scale-105 active:scale-95"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="mt-4 text-xs text-white/50">
              Property Type, Beds &amp; Baths, and Price are static, for layout
              only. Only Location is wired up, since that is the field the task
              asks for.
            </p>
          </div>
        </div>
      </main>

      <div className="mx-auto mt-8 w-full max-w-5xl px-6">
        <div className="rounded-lg border border-dashed border-ink-100 bg-white/60 p-4 text-sm text-ink-500">
          Try typing fast, e.g. &ldquo;l&rdquo; then quickly
          &ldquo;lekki&rdquo;. The list should only ever settle on results for
          what is currently in the box, never an earlier keystroke&rsquo;s
          response arriving late. See the{" "}
          <Link href="/docs" className="text-brand-600 underline">
            documentation page
          </Link>{" "}
          for how that is guaranteed.
        </div>
      </div>

      <footer className="mt-auto py-10 text-center text-xs text-ink-500">
        Built by Etinosa Ogbevoen for Expert Listing&rsquo;s Frontend Engineer
        screening task.
      </footer>
    </div>
  );
}

const BUILDINGS = [
  { x: 0, w: 40, h: 90 },
  { x: 42, w: 26, h: 140 },
  { x: 70, w: 34, h: 70 },
  { x: 106, w: 22, h: 180 },
  { x: 130, w: 44, h: 110 },
  { x: 176, w: 28, h: 220 },
  { x: 206, w: 36, h: 95 },
  { x: 244, w: 24, h: 160 },
  { x: 270, w: 40, h: 130 },
  { x: 312, w: 30, h: 200 },
  { x: 344, w: 26, h: 85 },
  { x: 372, w: 38, h: 150 },
];

function Skyline({ className = "" }: { className?: string }) {
  const maxH = Math.max(...BUILDINGS.map((b) => b.h));
  return (
    <svg
      viewBox={`0 0 400 ${maxH}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      {BUILDINGS.map((b) => (
        <rect
          key={b.x}
          x={b.x}
          y={maxH - b.h}
          width={b.w}
          height={b.h}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="opacity-90"
      title="Visual only - not part of the screening task"
    >
      <span className="mb-2 block text-sm font-medium text-white/80">
        {label}
      </span>
      <div className="flex h-[50px] items-center rounded-lg border border-white/40 bg-white/90 px-4 text-sm text-ink-500 backdrop-blur-sm">
        {value}
      </div>
    </div>
  );
}
