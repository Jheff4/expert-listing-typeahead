import Link from "next/link";
import DocsToc from "@/components/DocsToc";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-ink-100 py-10">
      <h2 className="text-xl font-semibold text-ink-900">{title}</h2>
      <div className="prose-sm mt-4 max-w-none space-y-4 text-[15px] leading-relaxed text-ink-700">
        {children}
      </div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-ink-900 px-4 py-3 text-xs leading-relaxed text-brand-100">
      <code>{children}</code>
    </pre>
  );
}

const toc = [
  ["overview", "Overview"],
  ["architecture", "Architecture"],
  ["debouncing", "Debouncing"],
  ["stale-responses", "Stale and out-of-order responses"],
  ["states", "Loading, empty, and error states"],
  ["keyboard", "Keyboard navigation and accessibility"],
  ["api-choice", "Why Photon"],
  ["aliases", "Local aliases (“ICM”)"],
  ["scaling", "Scaling and hardening for production"],
  ["testing", "Testing strategy"],
  ["tradeoffs", "Tradeoffs and what I skipped"],
] as const;

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-brand-700"
      >
        <span
          aria-hidden="true"
          className="transition-transform duration-150 group-hover:-translate-x-1"
        >
          &larr;
        </span>
        Back to demo
      </Link>

      <p className="mt-6 text-sm font-medium text-brand-700">Documentation</p>
      <h1 className="mt-1 text-3xl font-semibold text-ink-900">
        Location Typeahead
      </h1>
      <p className="mt-3 max-w-2xl text-ink-500">
        How this component is built, why each decision was made, and what
        would change if it had to survive real production traffic.
      </p>

      <div className="mt-8">
        <DocsToc toc={toc} />

        <Section id="overview" title="Overview">
          <p>
            This is a location search-as-you-type field for Nigerian
            neighbourhoods, built for the Expert Listing Frontend Engineer
            screening task. It queries Photon, a free OpenStreetMap-based
            geocoding API, as the user types, and it is scoped to the four
            behaviours the task explicitly asks for: debounced input,
            loading/empty/error states, keyboard navigation, and correct
            handling of stale or out-of-order network responses.
          </p>
          <p>
            The component lives at{" "}
            <code>components/LocationTypeahead.tsx</code> and has no
            dependency on any particular page or layout, so it can be dropped
            into a real listings search bar, a filter panel, or an address
            field on a verification form without changes.
          </p>
        </Section>

        <Section id="architecture" title="Architecture">
          <p>The moving pieces, each with one job:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <code>useDebouncedValue</code> (<code>lib/useDebouncedValue.ts</code>) -
              a generic hook that delays committing a fast-changing value.
              Knows nothing about search or networking.
            </li>
            <li>
              <code>searchLocations</code> (<code>lib/geocode.ts</code>) - the
              only place that talks to Photon. Takes an{" "}
              <code>AbortSignal</code> so the caller controls cancellation.
            </li>
            <li>
              <code>LocationTypeahead</code> (
              <code>components/LocationTypeahead.tsx</code>) - owns the input,
              the request lifecycle, the five UI states, and keyboard
              behaviour.
            </li>
          </ul>
          <p>
            Splitting it this way means the race-condition fix and the
            debounce logic can each be reasoned about, and tested,
            independently of the UI.
          </p>
        </Section>

        <Section id="debouncing" title="Debouncing">
          <p>
            Every keystroke updates <code>query</code> immediately, so the
            input never feels laggy. A separate <code>debouncedQuery</code>{" "}
            value only updates 350ms after typing pauses, and only{" "}
            <code>debouncedQuery</code> triggers a network request. 350ms
            sits in the usual 250 to 400ms range: short enough that the UI
            still feels responsive, long enough to collapse a burst of
            keystrokes (typing &ldquo;lekki&rdquo; is 6 keystrokes) into a
            single request instead of six.
          </p>
          <p>
            A minimum character threshold of 2 also applies before any
            request fires, since single-character queries against a
            country-scoped geocoder return too much noise to be useful and
            cost a request for almost no signal.
          </p>
        </Section>

        <Section id="stale-responses" title="Stale and out-of-order responses">
          <p>
            This is the part of the task most solutions get wrong, so it is
            worth explaining the mechanism rather than just naming it.
          </p>
          <p>
            Even with debouncing, two requests can be in flight close
            together (the user pauses, a request fires, then resumes typing
            before that request resolves). Network timing is not guaranteed
            to match request order: the response for an earlier, shorter
            query can arrive after the response for a later, more specific
            one, especially against a public API with variable latency. If
            every response is allowed to call <code>setResults</code>{" "}
            unconditionally, the last response to arrive wins, not the last
            request that was made, and the user can see results for
            &ldquo;lek&rdquo; overwrite the correct results for
            &ldquo;lekki&rdquo;.
          </p>
          <p>The fix used here is an <code>AbortController</code> per request:</p>
          <Code>{`useEffect(() => {
  abortRef.current?.abort();          // cancel whatever is still in flight
  const controller = new AbortController();
  abortRef.current = controller;

  searchLocations(debouncedQuery, controller.signal)
    .then(setResults)
    .catch((err) => {
      if (err.name === "AbortError") return;  // expected, not a real error
      setStatus("error");
    });

  return () => controller.abort();    // cleanup on unmount / next effect run
}, [debouncedQuery]);`}</Code>
          <p>
            Every time <code>debouncedQuery</code> changes, the previous
            controller is aborted before the new request starts. A response
            that would have arrived late for an old query is never given the
            chance to reach <code>setResults</code>, because the fetch itself
            is cancelled at the network layer, not filtered after the fact.
            This also has a practical side benefit: it stops in-flight
            requests the user no longer cares about from consuming bandwidth
            and, on a rate-limited free API like Photon, from burning quota
            on queries that are already stale.
          </p>
          <p>
            The alternative is a request-sequence counter (increment an id
            per request, only commit if the response&rsquo;s id is still the
            latest). That works too, and is marginally simpler for an API you
            cannot cancel client-side. <code>AbortController</code> was
            preferred here because it also cancels the underlying network
            request rather than letting it complete and discarding the
            result, which matters more once you are worried about server
            load and rate limits, not just UI correctness.
          </p>
        </Section>

        <Section id="states" title="Loading, empty, and error states">
          <p>
            The component tracks an explicit <code>status</code> of{" "}
            <code>idle | loading | error | empty | success</code>, rather than
            inferring UI from <code>results.length</code> plus a boolean
            spinner flag. That distinction matters because
            &ldquo;zero results&rdquo; and &ldquo;the request failed&rdquo;
            need different copy and, in a real product, different next
            actions (broaden your search vs. try again).
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>loading</strong> - a small radar-style indicator in the
              input (a pulsing ring behind a location pin, built on
              Tailwind&rsquo;s <code>animate-ping</code>) plus a
              &ldquo;Searching Nigerian locations...&rdquo; row in the panel.
            </li>
            <li>
              <strong>empty</strong> - &ldquo;No matches for
              &lsquo;{"{query}"}&rsquo;&rdquo;, so the user knows their search
              ran, it just found nothing.
            </li>
            <li>
              <strong>error</strong> - a distinct, <code>role="alert"</code>{" "}
              row so assistive tech announces it, separate from an empty
              result set.
            </li>
          </ul>
        </Section>

        <Section id="keyboard" title="Keyboard navigation and accessibility">
          <p>
            The input, listbox, and options follow the ARIA combobox pattern:
            the wrapper carries <code>role="combobox"</code> with{" "}
            <code>aria-expanded</code> and <code>aria-owns</code>, the input
            carries <code>aria-controls</code> and{" "}
            <code>aria-activedescendant</code> pointing at the highlighted
            option, and the results render as{" "}
            <code>role="listbox"</code> / <code>role="option"</code> with{" "}
            <code>aria-selected</code>. A screen reader user gets the same
            information a sighted user gets from the highlighted row.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>ArrowDown / ArrowUp</strong> - move the highlighted
              option, wrapping at either end.
            </li>
            <li>
              <strong>Enter</strong> - commits the highlighted option.
            </li>
            <li>
              <strong>Escape</strong> - closes the panel without clearing the
              input.
            </li>
            <li>
              <strong>Tab</strong> - closes the panel and lets focus move on
              normally, rather than trapping it.
            </li>
          </ul>
          <p>
            Selecting an option with the mouse uses{" "}
            <code>onMouseDown</code> with <code>preventDefault()</code> rather
            than <code>onClick</code>, so the click does not first blur the
            input (which would close the panel) before the selection handler
            runs.
          </p>
        </Section>

        <Section id="api-choice" title="Why Photon">
          <p>
            The task allows any public API. The first version of this used
            OpenStreetMap&rsquo;s Nominatim <code>/search</code> endpoint,
            since it is a free, key-free stand-in for what Expert
            Listing&rsquo;s own search bar needs: free-text search over
            Nigerian places, returning coordinates a real implementation
            would feed into the map and flood-risk layers described in the
            job post.
          </p>
          <p>
            Testing it by actually typing into it (not just reading the API
            docs) surfaced a real problem: Nominatim&rsquo;s public{" "}
            <code>/search</code> endpoint isn&rsquo;t built for autocomplete.
            &ldquo;lekki&rdquo; worked, but &ldquo;lek&rdquo; returned
            unrelated results and &ldquo;lekk&rdquo; (one keystroke short of
            correct) returned nothing at all, exactly the queries a typeahead
            spends most of its time handling while the user is still typing.
          </p>
          <p>
            The fix was switching to{" "}
            <a
              href="https://photon.komoot.io/"
              className="text-brand-700 underline"
              target="_blank"
              rel="noreferrer"
            >
              Photon
            </a>
            , komoot&rsquo;s free, key-free geocoder built on the same
            OpenStreetMap data but purpose-designed for exactly this
            typeahead use case. Same data source, same &ldquo;no API
            key&rdquo; property that keeps this repo runnable without a
            signup step, but correct prefix matching: querying Photon for
            just &ldquo;le&rdquo; returns Lekki Conservation Center, Lekki
            Phase I, and Lekki Peninsula II as the top results, confirmed by
            calling both APIs directly and comparing the responses rather
            than assuming. That swap lives entirely in{" "}
            <code>lib/geocode.ts</code>; nothing in the debounce,
            cancellation, or state-machine logic needed to change; the fix
            was a data-source problem, not a component-logic one.
          </p>
          <p>
            The tradeoff is that Photon&rsquo;s public instance, like
            Nominatim&rsquo;s, is a shared free service meant for light,
            non-bulk use, not production traffic. See{" "}
            <a href="#scaling" className="text-brand-700 underline">
              Scaling
            </a>{" "}
            below.
          </p>
        </Section>

        <Section id="aliases" title="Local aliases (“ICM”)">
          <p>
            A user asked, reasonably: why doesn&rsquo;t searching
            &ldquo;ICM&rdquo; find Ikeja City Mall, the way locals actually
            refer to it? Checked directly against Photon rather than
            guessing: querying &ldquo;Ikeja City Mall&rdquo; returns it
            correctly, querying &ldquo;ICM&rdquo; returns unrelated places in
            Italy, Germany, and France that happen to share that literal
            name. OpenStreetMap doesn&rsquo;t have an{" "}
            <code>alt_name</code> or <code>short_name</code> tag on Ikeja
            City Mall set to &ldquo;ICM&rdquo;, so no geocoder built on that
            data, Photon or Nominatim, can resolve it. It is a gap in the
            map data, not a bug in the matching algorithm.
          </p>
          <p>
            <code>lib/aliases.ts</code> adds a small, hand-curated table of
            Lagos-area abbreviations (ICM, VI, VGC, GRA, and a couple more)
            that get swapped for their canonical name before the request
            goes out, and the panel shows a &ldquo;Showing results for
            &lsquo;Ikeja City Mall&rsquo;&rdquo; note so the swap is never
            silent. This is a demonstration of the fix, not a real
            gazetteer: six entries, chosen by hand. In production this table
            would live server-side, be considerably larger, and realistically
            would be seeded from whatever users type that returns zero
            results, since that is the actual signal for which local aliases
            are missing.
          </p>
        </Section>

        <Section id="scaling" title="Scaling and hardening for production">
          <p>If this shipped behind real listings-search traffic:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Move the geocoding call behind a backend proxy.</strong>{" "}
              Never call a third-party geocoder directly from the browser at
              scale: it exposes the provider choice, cannot be cached
              server-side, and cannot be rate-limited per user. A thin
              backend route also lets you swap the public Photon instance for
              a self-hosted one or a paid, SLA-backed provider (Mapbox,
              Google Places, Algolia Places) without touching the frontend.
            </li>
            <li>
              <strong>Cache identical queries.</strong> Neighbourhood names
              repeat heavily across users; an edge or Redis cache keyed on
              the normalised query with a short TTL (minutes, not seconds)
              would remove most repeat load without staling results
              meaningfully.
            </li>
            <li>
              <strong>Raise the minimum character threshold or add a
              popularity-ranked local list</strong> for the first character
              or two, falling back to the network only past that, since
              short queries are the highest-volume, lowest-signal requests.
            </li>
            <li>
              <strong>Rate-limit per client</strong> at the proxy so a
              scripted or misbehaving client cannot turn typeahead into a
              denial-of-service vector against the geocoding provider.
            </li>
            <li>
              <strong>CDN-edge caching</strong> for the proxy&rsquo;s
              responses on popular queries, if traffic is geographically
              concentrated (it would be, for a Lagos-focused product).
            </li>
          </ul>
        </Section>

        <Section id="testing" title="Testing strategy">
          <p>
            Tests live in <code>__tests__/LocationTypeahead.test.tsx</code>{" "}
            and run with Vitest and Testing Library. Priority order, most
            important first:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>The stale-response race, explicitly.</strong> Mock{" "}
              <code>fetch</code> so the first request (for a short query)
              resolves <em>after</em> the second request (for a longer,
              more specific query) that was fired later. Assert the panel
              ends up showing the second query&rsquo;s results, not the
              first&rsquo;s. This is the one test that actually proves the{" "}
              <code>AbortController</code> logic works, rather than just
              trusting it by inspection.
            </li>
            <li>
              Debounce behaviour with fake timers: typing several characters
              quickly triggers exactly one network call, not one per
              keystroke.
            </li>
            <li>
              Each of the five states rendering the right copy and ARIA
              attributes given a mocked resolved, empty, or rejected fetch.
            </li>
            <li>
              Keyboard flow: ArrowDown moves <code>aria-activedescendant</code>,
              Enter commits the highlighted option and closes the panel.
            </li>
          </ul>
          <p>
            For a real product I would add Playwright end-to-end coverage
            against a staging deploy (real network, real latency variance)
            and a visual regression check on the panel, since typeahead bugs
            are disproportionately about timing and layout, not logic that
            unit tests alone reliably catch.
          </p>
        </Section>

        <Section id="tradeoffs" title="Tradeoffs and what I skipped">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              No result caching client-side (e.g. re-showing
              &ldquo;lekki&rdquo; results instantly if the user deletes and
              retypes it). Straightforward to add with a{" "}
              <code>Map</code> keyed on the query, skipped here to keep the
              request-lifecycle logic the reviewer has to read in one place.
            </li>
            <li>
              No virtualised list. At a limit of 8 results this does not
              matter; it would if the result count were user-configurable or
              much larger.
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
