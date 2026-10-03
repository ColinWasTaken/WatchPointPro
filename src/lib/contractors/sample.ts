import type { ContractorProvider } from "./provider";

// Made-up businesses for local development and tests. Used only when CONTRACTOR_SEARCH=sample.
export function sampleProvider(): ContractorProvider {
  return {
    attribution: "sample data (development only)",
    async geocode() {
      return { lat: 26.142, lng: -81.7948 };
    },
    async search(query, near) {
      return Array.from({ length: 6 }, (_, i) => ({
        id: `sample-${i}`,
        name: `Sample ${query.replace(/\b\w/g, (c) => c.toUpperCase())} ${i + 1}`,
        rating: i === 5 ? null : Math.round((3.6 + ((i * 7) % 14) / 10) * 10) / 10,
        reviewCount: i === 5 ? null : 8 + i * 41,
        address: `${120 + i * 15} Sample St, Naples, FL 34102`,
        phone: `(239) 555-01${10 + i}`,
        website: i % 2 ? null : `https://sample-${i}.test.example`,
        mapsUrl: null,
        location: { lat: near.lat + 0.012 * (i + 1) * (i % 2 ? 1 : -1), lng: near.lng + 0.009 * i },
      }));
    },
  };
}
