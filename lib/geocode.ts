export type GeoResult = {
  id: string;
  name: string;
  detail: string;
  lat: number;
  lon: number;
};

const ENDPOINT = "https://photon.komoot.io/api/";

// Lagos, used to bias results toward Nigeria and to rank nearby places
// first - Photon has no simple "countrycodes" filter like Nominatim, so
// results are also filtered client-side by `countrycode` below.
const LAGOS_LAT = 6.5244;
const LAGOS_LON = 3.3792;

type PhotonFeature = {
  properties: {
    osm_id: number;
    name?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
  geometry: { coordinates: [number, number] };
};

// Photon (komoot's free, key-free geocoder over OpenStreetMap data) was
// swapped in for Nominatim's own /search endpoint after testing showed
// Nominatim's public instance doesn't do the prefix/partial-word matching
// an autocomplete field needs: "lekki" worked, but "lek" surfaced unrelated
// results and "lekk" (one keystroke short) returned nothing. Photon is
// purpose-built for exactly this typeahead use case on the same underlying
// OSM data, and returns correct Lekki-area results from as little as "le".
// See CONTEXT.md and app/docs/page.tsx ("Why Photon") for the comparison.
export async function searchLocations(
  query: string,
  signal: AbortSignal
): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    q: query,
    lat: String(LAGOS_LAT),
    lon: String(LAGOS_LON),
    limit: "10",
  });

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Geocoding request failed with status ${res.status}`);
  }

  const data = (await res.json()) as { features: PhotonFeature[] };

  return data.features
    .filter((f) => f.properties.countrycode === "NG" && f.properties.name)
    .slice(0, 8)
    .map((f) => {
      const p = f.properties;
      const detail = [p.name, p.district, p.city, p.county, p.state, p.country]
        .filter((part, index, all) => part && all.indexOf(part) === index)
        .join(", ");
      return {
        id: String(p.osm_id),
        name: p.name as string,
        detail,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      };
    });
}
