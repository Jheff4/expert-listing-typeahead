// OpenStreetMap only knows a place by whatever name someone tagged it
// with, so a geocoder built on it (Photon or Nominatim) has no way to
// resolve a colloquial local abbreviation that was never added as an
// alt_name/short_name tag. "ICM" for Ikeja City Mall is exactly that case:
// verified directly against the Photon API - "Ikeja City Mall" resolves
// correctly, "ICM" resolves to places in Italy, Germany, and France also
// literally named "ICM", nothing in Nigeria.
//
// This is a small, hand-curated list of Lagos-area aliases as a
// demonstration of the fix, not a real gazetteer. In production this table
// would live server-side (so it can be extended without a redeploy) and
// would be considerably larger, likely crowdsourced from what users
// actually type and get zero results for.
const LOCAL_ALIASES: Record<string, string> = {
  ICM: "Ikeja City Mall",
  VGC: "Victoria Garden City",
  VI: "Victoria Island",
  GRA: "Ikeja GRA",
  UNILAG: "University of Lagos",
  LASU: "Lagos State University",
};

export function resolveLocalAlias(query: string): string | null {
  const key = query.trim().toUpperCase();
  return LOCAL_ALIASES[key] ?? null;
}
