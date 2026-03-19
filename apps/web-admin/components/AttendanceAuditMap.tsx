"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "./location-map-picker";

type AttendanceAuditMapProps = {
  apiKey?: string;
  eventLabel: string;
  eventLatitude: number;
  eventLongitude: number;
  locationLabel: string;
  locationLatitude: number;
  locationLongitude: number;
  geofenceRadiusMeters: number;
};

const SCRIPT_FALLBACK_LATITUDE = 55.0302;
const SCRIPT_FALLBACK_LONGITUDE = 82.9204;

export function AttendanceAuditMap({
  apiKey,
  eventLabel,
  eventLatitude,
  eventLongitude,
  locationLabel,
  locationLatitude,
  locationLongitude,
  geofenceRadiusMeters,
}: AttendanceAuditMapProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const eventMarkerRef = useRef<any>(null);
  const locationMarkerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing_key" | "error">(
    apiKey ? "loading" : "missing_key",
  );

  useEffect(() => {
    if (!apiKey) {
      setStatus("missing_key");
      return;
    }

    const resolvedApiKey = apiKey;

    let cancelled = false;

    async function initMap() {
      try {
        const maps = await loadGoogleMaps(resolvedApiKey);
        if (cancelled || !mapNodeRef.current) return;

        const center = {
          lat: locationLatitude || eventLatitude || SCRIPT_FALLBACK_LATITUDE,
          lng: locationLongitude || eventLongitude || SCRIPT_FALLBACK_LONGITUDE,
        };

        if (!mapRef.current) {
          mapRef.current = new maps.Map(mapNodeRef.current, {
            center,
            zoom: 16,
            disableDefaultUI: true,
            zoomControl: true,
            clickableIcons: false,
            gestureHandling: "greedy",
          });

          locationMarkerRef.current = new maps.Marker({
            map: mapRef.current,
            position: { lat: locationLatitude, lng: locationLongitude },
            title: locationLabel,
          });

          eventMarkerRef.current = new maps.Marker({
            map: mapRef.current,
            position: { lat: eventLatitude, lng: eventLongitude },
            title: eventLabel,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#3154ff",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });

          circleRef.current = new maps.Circle({
            map: mapRef.current,
            center: { lat: locationLatitude, lng: locationLongitude },
            radius: geofenceRadiusMeters,
            strokeColor: "#3154ff",
            strokeOpacity: 0.85,
            strokeWeight: 2,
            fillColor: "#3154ff",
            fillOpacity: 0.12,
          });
        } else {
          locationMarkerRef.current?.setPosition({
            lat: locationLatitude,
            lng: locationLongitude,
          });
          locationMarkerRef.current?.setTitle(locationLabel);
          eventMarkerRef.current?.setPosition({
            lat: eventLatitude,
            lng: eventLongitude,
          });
          eventMarkerRef.current?.setTitle(eventLabel);
          circleRef.current?.setCenter({
            lat: locationLatitude,
            lng: locationLongitude,
          });
          circleRef.current?.setRadius(geofenceRadiusMeters);
        }

        const bounds = new maps.LatLngBounds();
        bounds.extend({ lat: locationLatitude, lng: locationLongitude });
        bounds.extend({ lat: eventLatitude, lng: eventLongitude });
        mapRef.current.fitBounds(bounds, 72);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    void initMap();

    return () => {
      cancelled = true;
    };
  }, [
    apiKey,
    eventLabel,
    eventLatitude,
    eventLongitude,
    geofenceRadiusMeters,
    locationLabel,
    locationLatitude,
    locationLongitude,
  ]);

  if (status === "missing_key") {
    return (
      <div className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--panel-muted)] px-4 py-5 text-sm text-[color:var(--muted-foreground)]">
        Добавь `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, чтобы видеть карту событий.
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-[20px] border border-[color:var(--soft-danger)] bg-[color:var(--panel-muted)] px-4 py-5 text-sm text-[color:var(--danger)]">
        Не удалось загрузить Google Maps для журнала событий.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3">
        <div>
          <strong className="text-sm text-[color:var(--foreground)]">
            Событие и рабочая точка
          </strong>
          <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
            Круг показывает разрешённую геозону.
          </p>
        </div>
      </div>
      <div className="h-[320px] w-full bg-[color:var(--panel-muted)]" ref={mapNodeRef} />
    </div>
  );
}
