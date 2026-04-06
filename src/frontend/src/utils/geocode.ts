// Module-level cache to avoid duplicate Nominatim calls
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

export async function forwardGeocode(
  location: string,
): Promise<{ lat: number; lng: number } | null> {
  const key = location.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    const result = data[0]
      ? {
          lat: Number.parseFloat(data[0].lat),
          lng: Number.parseFloat(data[0].lon),
        }
      : null;
    geocodeCache.set(key, result);
    return result;
  } catch {
    geocodeCache.set(key, null);
    return null;
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ city: string; country: string } | null> {
  // ISSUE 17: Wrap Nominatim fetch in a 6-second timeout so the
  // submit button is never stuck disabled forever if the request hangs.
  const actualFetch = fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { "Accept-Language": "en" } },
  )
    .then(async (res) => {
      const data = await res.json();
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.county ||
        "";
      const country = data.address?.country || "";
      return { city, country };
    })
    .catch(() => null);

  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 6000),
  );

  return Promise.race([actualFetch, timeoutPromise]);
}
