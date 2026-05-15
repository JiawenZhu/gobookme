import process from "node:process";
import { ErrorWithCode } from "@calcom/lib/errors";

type GoogleGeocodeResult = {
  formatted_address?: string;
  place_id?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
};

type GoogleGeocodeResponse = {
  status: string;
  results?: GoogleGeocodeResult[];
  error_message?: string;
};

export type GeocodedBusinessAddress = {
  address: string;
  googlePlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
};

export async function geocodeBusinessAddress(address: string): Promise<GeocodedBusinessAddress | null> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  const trimmedAddress = address.trim();

  if (!trimmedAddress) return null;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    address: trimmedAddress,
    key: apiKey,
  });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);

  if (!response.ok) {
    throw ErrorWithCode.Factory.BadRequest(`Google Maps geocoding failed with status ${response.status}`);
  }

  const payload = (await response.json()) as GoogleGeocodeResponse;
  if (payload.status === "ZERO_RESULTS") return null;
  if (payload.status !== "OK") {
    throw ErrorWithCode.Factory.BadRequest(payload.error_message || "Google Maps geocoding failed");
  }

  const result = payload.results?.[0];
  const latitude = result?.geometry?.location?.lat ?? null;
  const longitude = result?.geometry?.location?.lng ?? null;

  return {
    address: result?.formatted_address || trimmedAddress,
    googlePlaceId: result?.place_id ?? null,
    latitude,
    longitude,
  };
}
