import type { Business, ContractorProvider } from "./provider";

// Google Places API (New) Text Search, biased to a circle around the property, plus the Geocoding
// API for properties without stored coordinates. Server-side only: the key never reaches browsers.

const FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.businessStatus",
].join(",");

type Place = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
};

export function googlePlaces(apiKey: string): ContractorProvider {
  return {
    attribution: "Google Maps",

    async geocode(address) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as {
        status: string;
        error_message?: string;
        results?: { geometry: { location: { lat: number; lng: number } } }[];
      };
      if (data.status === "ZERO_RESULTS") return null;
      if (data.status !== "OK") throw new Error(`Geocoding: ${data.status} ${data.error_message ?? ""}`);
      const location = data.results?.[0]?.geometry.location;
      return location ? { lat: location.lat, lng: location.lng } : null;
    },

    async search(query, near, radiusMeters) {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELDS },
        body: JSON.stringify({
          textQuery: query,
          pageSize: 15,
          locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: radiusMeters } },
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Places search: ${res.status} ${(await res.text()).slice(0, 300)}`);
      const data = (await res.json()) as { places?: Place[] };
      return (data.places ?? [])
        .filter((p) => !p.businessStatus || p.businessStatus === "OPERATIONAL")
        .map(
          (p): Business => ({
            id: p.id,
            name: p.displayName?.text ?? "Unnamed business",
            rating: p.rating ?? null,
            reviewCount: p.userRatingCount ?? null,
            address: p.formattedAddress ?? null,
            phone: p.nationalPhoneNumber ?? null,
            website: p.websiteUri ?? null,
            mapsUrl: p.googleMapsUri ?? null,
            location: p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null,
          }),
        );
    },
  };
}
