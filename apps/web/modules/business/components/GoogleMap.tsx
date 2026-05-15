"use client";

import { useEffect, useRef, useState } from "react";

type GoogleMapProps = {
  apiKey?: string;
  latitude: number | null;
  longitude: number | null;
  label: string;
};

type GoogleLatLng = {
  lat: number;
  lng: number;
};

type GoogleMapConstructor = new (
  element: HTMLElement,
  options: { center: GoogleLatLng; zoom: number; mapTypeControl: boolean; streetViewControl: boolean }
) => unknown;

type GoogleMarkerConstructor = new (options: {
  position: GoogleLatLng;
  map: unknown;
  title: string;
}) => unknown;

type GoogleMapsWindow = Window & {
  google?: {
    maps?: {
      Map?: GoogleMapConstructor;
      Marker?: GoogleMarkerConstructor;
    };
  };
};

const loadedScripts = new Set<string>();

function loadGoogleMaps(apiKey: string) {
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
    script.onerror = () => reject(new Error("Unable to load Google Maps"));
    document.head.appendChild(script);
  });
}

export function GoogleMap({ apiKey, latitude, longitude, label }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!apiKey || latitude === null || longitude === null || !mapRef.current) return;

    const center = { lat: latitude, lng: longitude };
    loadGoogleMaps(apiKey)
      .then(() => {
        const maps = (window as GoogleMapsWindow).google?.maps;
        if (!maps?.Map || !maps.Marker || !mapRef.current) return;

        const map = new maps.Map(mapRef.current, {
          center,
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
        });
        new maps.Marker({ position: center, map, title: label });
      })
      .catch(() => setFailed(true));
  }, [apiKey, label, latitude, longitude]);

  if (latitude === null || longitude === null) {
    return (
      <div className="border-subtle bg-muted flex h-64 items-center justify-center border text-sm text-subtle">
        Address map unavailable
      </div>
    );
  }

  if (!apiKey || failed) {
    const params = new URLSearchParams({ q: `${latitude},${longitude}` });
    return (
      <a
        className="border-subtle bg-muted flex h-64 items-center justify-center border text-sm font-medium text-emphasis"
        href={`https://www.google.com/maps/search/?api=1&${params.toString()}`}
        rel="noreferrer"
        target="_blank">
        Open location in Google Maps
      </a>
    );
  }

  return <div ref={mapRef} className="border-subtle h-64 w-full border" aria-label={`${label} map`} />;
}
