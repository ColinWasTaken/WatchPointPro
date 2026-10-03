// The contractor-search service layer: pages talk to a ContractorProvider, so the data source
// (Google Places today) can be swapped without touching them.

export type GeoPoint = { lat: number; lng: number };

export type Business = {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  location: GeoPoint | null;
};

export interface ContractorProvider {
  // Credit shown under the results, as the data source requires.
  attribution: string;
  geocode(address: string): Promise<GeoPoint | null>;
  search(query: string, near: GeoPoint, radiusMeters: number): Promise<Business[]>;
}
