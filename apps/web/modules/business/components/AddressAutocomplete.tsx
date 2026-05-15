"use client";

import { useEffect, useRef, useState } from "react";

type AddressAutocompleteProps = {
  apiKey?: string;
  defaultAddress?: string | null;
  defaultPlaceId?: string | null;
  defaultLatitude?: number | null;
  defaultLongitude?: number | null;
};

type PlaceResult = {
  formatted_address?: string;
  place_id?: string;
  geometry?: {
    location?: {
      lat: () => number;
      lng: () => number;
    };
  };
};

type AutocompleteInstance = {
  addListener: (eventName: "place_changed", callback: () => void) => void;
  getPlace: () => PlaceResult;
};

type AutocompleteConstructor = new (
  input: HTMLInputElement,
  options: { fields: string[]; componentRestrictions: { country: string } }
) => AutocompleteInstance;

type GooglePlacesWindow = Window & {
  google?: {
    maps?: {
      places?: {
        Autocomplete?: AutocompleteConstructor;
      };
    };
  };
};

const loadedScripts = new Set<string>();

function loadGooglePlaces(apiKey: string) {
  const src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
  if (loadedScripts.has(src)) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existingScript) {
      loadedScripts.add(src);
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    script.onerror = () => reject(new Error("Unable to load Google Places"));
    document.head.appendChild(script);
  });
}

export function AddressAutocomplete({
  apiKey,
  defaultAddress,
  defaultPlaceId,
  defaultLatitude,
  defaultLongitude,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [placeId, setPlaceId] = useState(defaultPlaceId ?? "");
  const [latitude, setLatitude] = useState(defaultLatitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(defaultLongitude?.toString() ?? "");

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

    loadGooglePlaces(apiKey)
      .then(() => {
        const Autocomplete = (window as GooglePlacesWindow).google?.maps?.places?.Autocomplete;
        if (!Autocomplete || !inputRef.current) return;

        const autocomplete = new Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry", "place_id"],
          componentRestrictions: { country: "us" },
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address && inputRef.current) inputRef.current.value = place.formatted_address;
          setPlaceId(place.place_id ?? "");
          setLatitude(place.geometry?.location?.lat().toString() ?? "");
          setLongitude(place.geometry?.location?.lng().toString() ?? "");
        });
      })
      .catch(() => undefined);
  }, [apiKey]);

  return (
    <>
      <input
        ref={inputRef}
        className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
        name="address"
        placeholder="Business address"
        type="text"
        defaultValue={defaultAddress ?? ""}
      />
      <input name="googlePlaceId" type="hidden" value={placeId} />
      <input name="latitude" type="hidden" value={latitude} />
      <input name="longitude" type="hidden" value={longitude} />
    </>
  );
}
