# Expert Listing - Location Typeahead

Screening task submission for the Expert Listing Frontend Engineer role: a
debounced location typeahead against Photon (komoot's free geocoder over
OpenStreetMap data), with keyboard navigation, loading/empty/error states,
and a fix for stale, out-of-order network responses.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the demo and `http://localhost:3000/docs`
for the write-up on how it works and why.

## Test it

```bash
npm run test
```

## What's in here

- `components/LocationTypeahead.tsx` - the component
- `lib/geocode.ts` - the Photon API call
- `lib/useDebouncedValue.ts` - debounce hook
- `app/docs/page.tsx` - full documentation (architecture, the stale-response
  fix explained, scaling notes, testing strategy)
- `__tests__/LocationTypeahead.test.tsx` - test suite, including a test for
  the out-of-order response race condition
- `WRITEUP.md` - the application's required 150-300 word write-up
