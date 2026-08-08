"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Check, LocateFixed } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

declare global {
  interface Window {
    google?: any;
    __smartGoogleMapsInit?: () => void;
    __smartGoogleMapsLoader?: Promise<GoogleMapsBundle>;
  }
}

export type GoogleMapsLatLng = { lat: number; lng: number };

export type GoogleMapsBundle = {
  maps: any;
  mapId?: string;
  AdvancedMarkerElement?: any;
  PinElement?: any;
};

export type MapMarkerHandle = {
  setDraggable: (value: boolean) => void;
  setVisible: (value: boolean) => void;
  setPosition: (position: GoogleMapsLatLng) => void;
  setTitle: (title: string) => void;
  addListener: (eventName: string, handler: (event: any) => void) => any;
};

function getGoogleMapsMapId() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID";
}

async function buildGoogleMapsBundle(maps: any): Promise<GoogleMapsBundle> {
  const mapId = getGoogleMapsMapId();
  if (!mapId || typeof maps.importLibrary !== "function") {
    return { maps };
  }

  try {
    const markerLib = await maps.importLibrary("marker");
    return {
      maps,
      mapId,
      AdvancedMarkerElement: markerLib.AdvancedMarkerElement,
      PinElement: markerLib.PinElement,
    };
  } catch {
    return { maps };
  }
}

export function buildGoogleMapOptions(
  bundle: GoogleMapsBundle,
  base: Record<string, unknown>,
) {
  return bundle.mapId ? { ...base, mapId: bundle.mapId } : base;
}

export function createMapMarker(
  bundle: GoogleMapsBundle,
  args: {
    map: any;
    position: GoogleMapsLatLng;
    draggable?: boolean;
    visible?: boolean;
    title?: string;
    pin?: { background?: string; borderColor?: string; scale?: number };
  },
): MapMarkerHandle {
  const visible = args.visible !== false;

  if (bundle.AdvancedMarkerElement && bundle.mapId) {
    let content: Element | undefined;
    if (args.pin && bundle.PinElement) {
      const pin = new bundle.PinElement({
        background: args.pin.background ?? "#3154ff",
        borderColor: args.pin.borderColor ?? "#ffffff",
        scale: args.pin.scale ?? 1,
      });
      content = pin.element;
    }

    const marker = new bundle.AdvancedMarkerElement({
      map: visible ? args.map : null,
      position: args.position,
      gmpDraggable: args.draggable ?? false,
      title: args.title,
      ...(content ? { content } : {}),
    });

    return {
      setDraggable: (value) => {
        marker.gmpDraggable = value;
      },
      setVisible: (value) => {
        marker.map = value ? args.map : null;
      },
      setPosition: (position) => {
        marker.position = position;
      },
      setTitle: (title) => {
        marker.title = title;
      },
      addListener: (eventName, handler) => marker.addListener(eventName, handler),
    };
  }

  const marker = new bundle.maps.Marker({
    map: visible ? args.map : null,
    position: args.position,
    draggable: args.draggable ?? false,
    title: args.title,
    ...(args.pin
      ? {
          icon: {
            path: bundle.maps.SymbolPath.CIRCLE,
            scale: (args.pin.scale ?? 1) * 8,
            fillColor: args.pin.background ?? "#3154ff",
            fillOpacity: 1,
            strokeColor: args.pin.borderColor ?? "#ffffff",
            strokeWeight: 2,
          },
        }
      : {}),
  });

  return {
    setDraggable: (value) => marker.setDraggable(value),
    setVisible: (value) => marker.setVisible(value),
    setPosition: (position) => marker.setPosition(position),
    setTitle: (title) => marker.setTitle(title),
    addListener: (eventName, handler) => marker.addListener(eventName, handler),
  };
}

export type LocationAddressDetails = {
  city?: string;
  country?: string;
  formattedAddress?: string;
  postalCode?: string;
  region?: string;
  streetAddress?: string;
};

export type LocationSelection = {
  accuracyMeters?: number;
  address?: string;
  details?: LocationAddressDetails;
  googlePlaceId?: string;
  latitude: string;
  longitude: string;
  suggestedCompanyName?: string;
};

type LocationMapPickerProps = {
  address: string;
  apiKey?: string;
  geofenceRadiusMeters?: number;
  latitude: string;
  locale?: "ru" | "en";
  mode?: "preview" | "setup";
  longitude: string;
  onConfirmationRequiredChange?: (required: boolean) => void;
  onConfirmedSelect?: (next: LocationSelection) => Promise<void> | void;
  onSelect: (next: LocationSelection) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  searchTrailingContent?: ReactNode;
  showCopy?: boolean;
};

type BrowserLocationSample = {
  accuracyMeters: number;
  latitude: number;
  longitude: number;
};

type PendingLocationConfirmation = {
  selection: LocationSelection;
};

const DEFAULT_LATITUDE = 20;
const DEFAULT_LONGITUDE = 0;
const DEFAULT_MAP_ZOOM = 2;
const FALLBACK_SELECTED_LOCATION_ZOOM = 15;
const LOCATION_COLLECTION_DURATION_MS = 12_000;
const MAX_SETUP_LOCATION_ACCURACY_METERS = 100;
const PLUS_CODE_PATTERN =
  /\b[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/i;
const SCRIPT_ID = "smart-google-maps-api";

function collectBestBrowserLocation(
  onProgress: (sample: BrowserLocationSample, sampleCount: number) => void,
  signal: AbortSignal,
) {
  return new Promise<BrowserLocationSample>((resolve, reject) => {
    let bestSample: BrowserLocationSample | null = null;
    let sampleCount = 0;
    let watchId: number | null = null;
    let timer: number | null = null;
    let settled = false;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      signal.removeEventListener("abort", handleAbort);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();

      if (bestSample) {
        resolve(bestSample);
      } else {
        reject(new Error("LOCATION_CAPTURE_FAILED"));
      }
    };

    const fail = (error: GeolocationPositionError | Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    function handleAbort() {
      fail(new Error("LOCATION_CAPTURE_CANCELLED"));
    }

    signal.addEventListener("abort", handleAbort, { once: true });
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracyMeters = Math.round(position.coords.accuracy);
        if (!Number.isFinite(accuracyMeters)) {
          return;
        }

        sampleCount += 1;
        const sample = {
          accuracyMeters,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        if (!bestSample || sample.accuracyMeters < bestSample.accuracyMeters) {
          bestSample = sample;
        }

        onProgress(bestSample, sampleCount);
      },
      (error) => {
        if (bestSample && error.code !== 1) {
          finish();
          return;
        }
        fail(error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: LOCATION_COLLECTION_DURATION_MS,
      },
    );
    timer = window.setTimeout(finish, LOCATION_COLLECTION_DURATION_MS);
  });
}

function parseCoordinate(value: string, fallback: number) {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hasCoordinateValue(value: string) {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  );
}

function getAddressComponent(result: any, type: string) {
  return (
    result?.address_components?.find((component: any) =>
      component.types?.includes(type),
    )?.long_name ?? ""
  );
}

function getAddressDetails(result: any): LocationAddressDetails {
  const streetNumber = getAddressComponent(result, "street_number");
  const route = getAddressComponent(result, "route");
  const locality =
    getAddressComponent(result, "locality") ||
    getAddressComponent(result, "postal_town") ||
    getAddressComponent(result, "administrative_area_level_2") ||
    getAddressComponent(result, "administrative_area_level_1");

  return {
    city: locality || undefined,
    country: getAddressComponent(result, "country") || undefined,
    formattedAddress: result?.formatted_address || undefined,
    postalCode: getAddressComponent(result, "postal_code") || undefined,
    region:
      getAddressComponent(result, "administrative_area_level_1") || undefined,
    streetAddress: [streetNumber, route].filter(Boolean).join(" ") || undefined,
  };
}

function requiresManualAddressConfirmation(result: any) {
  const formattedAddress = String(result?.formatted_address ?? "");
  const resultTypes = Array.isArray(result?.types) ? result.types : [];
  const hasStreetLevelComponent = Boolean(
    getAddressComponent(result, "route") ||
    getAddressComponent(result, "street_number") ||
    getAddressComponent(result, "premise") ||
    getAddressComponent(result, "subpremise"),
  );
  const hasPlaceLevelType = resultTypes.some((type: string) =>
    [
      "establishment",
      "point_of_interest",
      "premise",
      "street_address",
    ].includes(type),
  );

  return (
    !result ||
    Boolean(result.plus_code) ||
    resultTypes.includes("plus_code") ||
    PLUS_CODE_PATTERN.test(formattedAddress) ||
    (!hasStreetLevelComponent && !hasPlaceLevelType)
  );
}

export function loadGoogleMaps(apiKey: string): Promise<GoogleMapsBundle> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Maps is only available in the browser."),
    );
  }

  if (window.google?.maps?.places || window.google?.maps?.importLibrary) {
    return buildGoogleMapsBundle(window.google.maps);
  }

  if (window.__smartGoogleMapsLoader) {
    return window.__smartGoogleMapsLoader;
  }

  window.__smartGoogleMapsLoader = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;

    const finalizeLoad = async () => {
      try {
        const maps = window.google?.maps;
        if (!maps) {
          reject(new Error("Google Maps API did not initialize."));
          return;
        }

        if (typeof maps.importLibrary === "function") {
          await maps.importLibrary("places");
        }

        if (!maps.places) {
          reject(new Error("Google Maps API loaded without places library."));
          return;
        }

        resolve(await buildGoogleMapsBundle(maps));
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Failed to initialize Google Maps places library."),
        );
      } finally {
        delete window.__smartGoogleMapsInit;
      }
    };

    window.__smartGoogleMapsInit = () => {
      void finalizeLoad();
    };

    if (existingScript) {
      if (window.google?.maps) {
        void finalizeLoad();
        return;
      }

      existingScript.addEventListener(
        "load",
        () => {
          void finalizeLoad();
        },
        { once: true },
      );
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Maps API.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async&libraries=places&callback=__smartGoogleMapsInit`;
    script.async = true;
    script.defer = true;
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load Google Maps API.")),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return window.__smartGoogleMapsLoader;
}

export function LocationMapPicker({
  address,
  apiKey,
  geofenceRadiusMeters,
  latitude,
  locale = "ru",
  longitude,
  mode = "setup",
  onConfirmationRequiredChange,
  onConfirmedSelect,
  onSelect,
  searchLabel = "Адрес организации",
  searchPlaceholder = "Например, Новосибирск, Красный проспект 25",
  searchTrailingContent,
  showCopy = true,
}: LocationMapPickerProps) {
  const autocompleteServiceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const circleRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<MapMarkerHandle | null>(null);
  const confirmationTimerRef = useRef<number | null>(null);
  const onConfirmedSelectRef = useRef(onConfirmedSelect);
  const onSelectRef = useRef(onSelect);
  const geofenceRadiusRef = useRef(geofenceRadiusMeters);
  const locationAbortControllerRef = useRef<AbortController | null>(null);
  const searchTimerRef = useRef<number | null>(null);
  const skipAutocompleteRef = useRef(false);
  const lastResolvedCoordsRef = useRef<string | null>(null);
  const searchInputId = useId();
  const [addressDetails, setAddressDetails] =
    useState<LocationAddressDetails | null>(null);
  const [searchValue, setSearchValue] = useState(address);
  const [status, setStatus] = useState<
    "loading" | "missing_key" | "ready" | "error"
  >(apiKey ? "loading" : "missing_key");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locationAccuracyMeters, setLocationAccuracyMeters] = useState<
    number | null
  >(null);
  const [locationMessageTone, setLocationMessageTone] = useState<
    "error" | "info" | "success"
  >("info");
  const [locationAccessMessage, setLocationAccessMessage] = useState<
    string | null
  >(null);
  const [pendingLocationConfirmation, setPendingLocationConfirmation] =
    useState<PendingLocationConfirmation | null>(null);
  const [confirmationPhase, setConfirmationPhase] = useState<
    "idle" | "saving" | "success" | "closing"
  >("idle");
  const isSetupMode = mode === "setup";
  const copy =
    locale === "ru"
      ? {
          copyTitle: "Адрес компании",
          copyBody:
            "Начни вводить город или адрес. Можно выбрать подсказку Google или поставить точку прямо на карте.",
          currentLocation: "Моё местоположение",
          locating: `Уточняем ${LOCATION_COLLECTION_DURATION_MS / 1000} секунд…`,
          accuracyProgress: (accuracy: number, samples: number) =>
            `Лучшая точность ±${accuracy} м · замеров: ${samples}`,
          accuracyAccepted: (accuracy: number) => `Точность ±${accuracy} м`,
          accuracyRejected: (accuracy: number) =>
            `Точность ±${accuracy} м недостаточна. Требуется не хуже ±${MAX_SETUP_LOCATION_ACCURACY_METERS} м.`,
          confirmLocationTitle: "Подтвердите точку",
          confirmLocationBody:
            "Для этой координаты Google не нашёл обычный адрес. Проверьте метку на карте перед сохранением.",
          confirmLocation: "Точка верная",
          savingLocation: "Сохраняем…",
          locationSaved: "Сохранено",
          chooseAnotherLocation: "Выбрать другую",
          locationUnsupported:
            "Браузер не поддерживает определение текущего местоположения.",
          locationPermission:
            "Разрешите доступ к геолокации в браузере, чтобы поставить точку по текущему местоположению.",
          locationFailed: "Не удалось определить текущее местоположение.",
          missingKey:
            "Добавь NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, чтобы включить карту и подсказки адресов.",
          missingKeyState:
            "Добавь `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, чтобы включить Google Maps, подсказки адресов и обратный геокодинг.",
          mapsFailed:
            "Не удалось загрузить Google Maps API. Проверь API key и включённые сервисы.",
          mapsInitFailed:
            "Google Maps не инициализировался. Обычно это значит, что у ключа не включён Places API (New), Maps JavaScript API или ключ ограничен для localhost.",
        }
      : {
          copyTitle: "Company address",
          copyBody:
            "Start typing a city or address. You can pick a Google suggestion or place the point directly on the map.",
          currentLocation: "My location",
          locating: `Refining for ${LOCATION_COLLECTION_DURATION_MS / 1000} seconds…`,
          accuracyProgress: (accuracy: number, samples: number) =>
            `Best accuracy ±${accuracy} m · readings: ${samples}`,
          accuracyAccepted: (accuracy: number) => `Accuracy ±${accuracy} m`,
          accuracyRejected: (accuracy: number) =>
            `Accuracy ±${accuracy} m is too low. ±${MAX_SETUP_LOCATION_ACCURACY_METERS} m or better is required.`,
          confirmLocationTitle: "Confirm this point",
          confirmLocationBody:
            "Google did not find a regular street address for these coordinates. Check the marker before saving.",
          confirmLocation: "Use this point",
          savingLocation: "Saving…",
          locationSaved: "Saved",
          chooseAnotherLocation: "Choose another",
          locationUnsupported:
            "This browser does not support current location detection.",
          locationPermission:
            "Allow browser location access to place the point at your current location.",
          locationFailed: "Unable to detect current location.",
          missingKey:
            "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map and address suggestions.",
          missingKeyState:
            "Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to enable Google Maps, address suggestions, and reverse geocoding.",
          mapsFailed:
            "Unable to load Google Maps API. Check the API key and enabled services.",
          mapsInitFailed:
            "Google Maps did not initialize. This usually means Places API (New), Maps JavaScript API, or localhost key restrictions are not configured.",
        };

  function syncGeofenceCircle(centerOverride?: { lat: number; lng: number }) {
    if (!mapRef.current || !window.google?.maps) return;

    const lat =
      centerOverride?.lat ?? parseCoordinate(latitude, DEFAULT_LATITUDE);
    const lng =
      centerOverride?.lng ?? parseCoordinate(longitude, DEFAULT_LONGITUDE);
    const hasCoords =
      Boolean(centerOverride) ||
      (hasCoordinateValue(latitude) && hasCoordinateValue(longitude));
    const radius = geofenceRadiusRef.current;

    if (!hasCoords || !radius || radius <= 0) {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      return null;
    }

    if (circleRef.current) {
      circleRef.current.setCenter({ lat, lng });
      circleRef.current.setRadius(radius);
      circleRef.current.setMap(mapRef.current);
      return circleRef.current;
    }

    circleRef.current = new window.google.maps.Circle({
      map: mapRef.current,
      center: { lat, lng },
      radius,
      fillColor: "#7c3aed",
      fillOpacity: 0.1,
      strokeColor: "#7c3aed",
      strokeOpacity: 0.5,
      strokeWeight: 2,
      clickable: false,
    });
    return circleRef.current;
  }

  function focusMapOnGeofence(center: { lat: number; lng: number }) {
    window.setTimeout(() => {
      if (!mapRef.current) return;

      window.google?.maps?.event?.trigger?.(mapRef.current, "resize");
      markerRef.current?.setVisible(true);
      markerRef.current?.setPosition(center);
      const circle = syncGeofenceCircle(center);
      const bounds = circle?.getBounds?.();

      if (bounds) {
        mapRef.current.fitBounds(bounds, 44);
        return;
      }

      mapRef.current.setCenter(center);
      mapRef.current.setZoom(FALLBACK_SELECTED_LOCATION_ZOOM);
    }, 80);
  }

  function applyLocationSelection(selection: LocationSelection) {
    const lat = Number(selection.latitude);
    const lng = Number(selection.longitude);

    setPendingLocationConfirmation(null);
    setConfirmationPhase("idle");
    lastResolvedCoordsRef.current = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    onSelectRef.current(selection);
  }

  function stageOrApplyLocation(
    result: any | null,
    lat: number,
    lng: number,
    options?: {
      accuracyMeters?: number;
      fallbackAddress?: string;
      googlePlaceId?: string;
      suggestedCompanyName?: string;
    },
  ) {
    const details = result ? getAddressDetails(result) : undefined;
    const addressValue =
      result?.formatted_address?.trim() ||
      options?.fallbackAddress?.trim() ||
      `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    const selection: LocationSelection = {
      address: addressValue,
      details,
      googlePlaceId: options?.googlePlaceId,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
      suggestedCompanyName: options?.suggestedCompanyName,
    };

    if (typeof options?.accuracyMeters === "number") {
      selection.accuracyMeters = options.accuracyMeters;
    }

    setAddressDetails(details ?? null);
    skipAutocompleteRef.current = true;
    setSearchValue(addressValue);
    setSuggestions([]);
    focusMapOnGeofence({ lat, lng });

    if (requiresManualAddressConfirmation(result)) {
      setConfirmationPhase("idle");
      setPendingLocationConfirmation({ selection });
      return false;
    }

    applyLocationSelection(selection);
    return true;
  }

  function reverseGeocodeLocation(lat: number, lng: number) {
    return new Promise<any | null>((resolve) => {
      if (!geocoderRef.current) {
        resolve(null);
        return;
      }

      geocoderRef.current.geocode(
        { location: { lat, lng } },
        (results: any[], geocodeStatus: string) => {
          resolve(geocodeStatus === "OK" && results?.[0] ? results[0] : null);
        },
      );
    });
  }

  function dismissPendingLocation() {
    if (confirmationTimerRef.current !== null) {
      window.clearTimeout(confirmationTimerRef.current);
      confirmationTimerRef.current = null;
    }
    setPendingLocationConfirmation(null);
    setConfirmationPhase("idle");
    setLocationAccuracyMeters(null);
    setLocationAccessMessage(null);
    skipAutocompleteRef.current = true;
    setSearchValue(address);

    if (hasCoordinateValue(latitude) && hasCoordinateValue(longitude)) {
      focusMapOnGeofence({
        lat: Number(latitude),
        lng: Number(longitude),
      });
      return;
    }

    markerRef.current?.setVisible(false);
    syncGeofenceCircle();
  }

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onConfirmedSelectRef.current = onConfirmedSelect;
  }, [onConfirmedSelect]);

  useEffect(() => {
    onConfirmationRequiredChange?.(pendingLocationConfirmation !== null);
  }, [onConfirmationRequiredChange, pendingLocationConfirmation]);

  useEffect(() => {
    geofenceRadiusRef.current = geofenceRadiusMeters;
  }, [geofenceRadiusMeters]);

  useEffect(() => {
    return () => {
      locationAbortControllerRef.current?.abort();
      if (confirmationTimerRef.current !== null) {
        window.clearTimeout(confirmationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    skipAutocompleteRef.current = true;
    setSearchValue(address);
  }, [address]);

  // Sync geofence circle on map
  useEffect(() => {
    syncGeofenceCircle();
  }, [latitude, longitude, geofenceRadiusMeters]);

  useEffect(() => {
    const googleMapsApiKey = apiKey;

    if (!googleMapsApiKey) {
      setStatus("missing_key");
      setStatusMessage(copy.missingKey);
      return;
    }

    const resolvedApiKey: string = googleMapsApiKey;
    let cancelled = false;

    async function initMap() {
      try {
        setStatus("loading");
        setStatusMessage(null);
        const googleMaps = await loadGoogleMaps(resolvedApiKey);
        if (cancelled || !mapNodeRef.current) return;
        const maps = googleMaps.maps;

        const center = {
          lat: parseCoordinate(latitude, DEFAULT_LATITUDE),
          lng: parseCoordinate(longitude, DEFAULT_LONGITUDE),
        };
        const hasCoordinates =
          hasCoordinateValue(latitude) && hasCoordinateValue(longitude);

        geocoderRef.current = geocoderRef.current ?? new maps.Geocoder();
        autocompleteServiceRef.current =
          autocompleteServiceRef.current ??
          new maps.places.AutocompleteService();

        if (!mapRef.current) {
          mapRef.current = new maps.Map(
            mapNodeRef.current,
            buildGoogleMapOptions(googleMaps, {
              center,
              zoom: hasCoordinates
                ? FALLBACK_SELECTED_LOCATION_ZOOM
                : DEFAULT_MAP_ZOOM,
              disableDefaultUI: true,
              gestureHandling: "greedy",
              clickableIcons: false,
              zoomControl: true,
              streetViewControl: false,
              fullscreenControl: false,
              mapTypeControl: false,
            }),
          );

          markerRef.current = createMapMarker(googleMaps, {
            map: mapRef.current,
            position: center,
            draggable: isSetupMode,
            visible: hasCoordinates,
          });

          if (isSetupMode) {
            mapRef.current.addListener("click", (event: any) => {
              const lat = event.latLng?.lat?.();
              const lng = event.latLng?.lng?.();
              if (typeof lat !== "number" || typeof lng !== "number") return;

              void reverseGeocodeLocation(lat, lng).then((result) => {
                stageOrApplyLocation(result, lat, lng, {
                  fallbackAddress: searchValue || address,
                });
              });
            });

            markerRef.current.addListener("dragend", (event: any) => {
              const lat = event.latLng?.lat?.();
              const lng = event.latLng?.lng?.();
              if (typeof lat !== "number" || typeof lng !== "number") return;

              void reverseGeocodeLocation(lat, lng).then((result) => {
                stageOrApplyLocation(result, lat, lng, {
                  fallbackAddress: searchValue || address,
                });
              });
            });
          }
        }

        markerRef.current?.setDraggable(isSetupMode);
        markerRef.current?.setVisible(hasCoordinates);
        markerRef.current?.setPosition(center);
        mapRef.current?.setCenter(center);
        syncGeofenceCircle();
        if (hasCoordinates) {
          focusMapOnGeofence(center);
        }
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatusMessage(copy.mapsInitFailed);
          setStatus("error");
        }
      }
    }

    void initMap();

    return () => {
      cancelled = true;
    };
  }, [apiKey, latitude, longitude]);

  useEffect(() => {
    if (!isSetupMode) return;
    if (!autocompleteServiceRef.current || status !== "ready") return;

    const query = searchValue.trim();
    if (!query) {
      setSuggestions([]);
      return;
    }

    if (skipAutocompleteRef.current) {
      skipAutocompleteRef.current = false;
      return;
    }

    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = window.setTimeout(() => {
      autocompleteServiceRef.current.getPlacePredictions(
        { input: query },
        (predictions: any[], autocompleteStatus: string) => {
          if (
            autocompleteStatus !== "OK" ||
            !Array.isArray(predictions) ||
            !predictions.length
          ) {
            setSuggestions([]);
            return;
          }

          setSuggestions(predictions.slice(0, 6));
        },
      );
    }, 180);

    return () => {
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, [isSetupMode, searchValue, status]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (!hasCoordinateValue(latitude) || !hasCoordinateValue(longitude)) return;

    const center = {
      lat: parseCoordinate(latitude, DEFAULT_LATITUDE),
      lng: parseCoordinate(longitude, DEFAULT_LONGITUDE),
    };

    focusMapOnGeofence(center);
  }, [latitude, longitude, geofenceRadiusMeters]);

  useEffect(() => {
    if (!geocoderRef.current) return;
    if (!address.trim()) return;
    if (hasCoordinateValue(latitude) && hasCoordinateValue(longitude)) {
      return;
    }

    geocoderRef.current.geocode(
      { address },
      (results: any[], geocodeStatus: string) => {
        const topResult = results?.[0];
        const lat = topResult?.geometry?.location?.lat?.();
        const lng = topResult?.geometry?.location?.lng?.();

        if (
          geocodeStatus !== "OK" ||
          !topResult ||
          typeof lat !== "number" ||
          typeof lng !== "number"
        ) {
          return;
        }

        stageOrApplyLocation(topResult, lat, lng, {
          fallbackAddress: address,
        });
      },
    );
  }, [address, latitude, longitude, status]);

  useEffect(() => {
    if (!isSetupMode) return;
    if (status !== "ready") return;
    if (!geocoderRef.current) return;
    if (!hasCoordinateValue(latitude) || !hasCoordinateValue(longitude)) return;

    const lat = Number(latitude);
    const lng = Number(longitude);
    const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;

    if (lastResolvedCoordsRef.current === coordKey) {
      return;
    }

    lastResolvedCoordsRef.current = coordKey;

    // A persisted address with persisted coordinates was already confirmed.
    // Hydration must never recreate the confirmation prompt.
    if (address.trim()) {
      return;
    }

    geocoderRef.current.geocode(
      { location: { lat, lng } },
      (results: any[], geocodeStatus: string) => {
        const topResult = results?.[0];

        if (geocodeStatus !== "OK" || !topResult) {
          return;
        }

        stageOrApplyLocation(topResult, lat, lng);
      },
    );
  }, [address, isSetupMode, latitude, longitude, status]);

  async function confirmPendingLocation() {
    if (!pendingLocationConfirmation || confirmationPhase !== "idle") return;

    const { selection } = pendingLocationConfirmation;
    const lat = Number(selection.latitude);
    const lng = Number(selection.longitude);
    setConfirmationPhase("saving");
    lastResolvedCoordsRef.current = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    onSelectRef.current(selection);

    try {
      await onConfirmedSelectRef.current?.(selection);
      if (typeof selection.accuracyMeters === "number") {
        setLocationMessageTone("success");
        setLocationAccessMessage(copy.accuracyAccepted(selection.accuracyMeters));
      }
      setConfirmationPhase("success");
      confirmationTimerRef.current = window.setTimeout(() => {
        setConfirmationPhase("closing");
        confirmationTimerRef.current = window.setTimeout(() => {
          setPendingLocationConfirmation(null);
          setConfirmationPhase("idle");
          confirmationTimerRef.current = null;
        }, 180);
      }, 260);
    } catch {
      setConfirmationPhase("idle");
    }
  }

  function handleSuggestionSelect(prediction: any) {
    geocoderRef.current?.geocode(
      { placeId: prediction.place_id },
      (results: any[], geocodeStatus: string) => {
        const topResult = results?.[0];
        const lat = topResult?.geometry?.location?.lat?.();
        const lng = topResult?.geometry?.location?.lng?.();

        if (
          geocodeStatus !== "OK" ||
          !topResult ||
          typeof lat !== "number" ||
          typeof lng !== "number"
        ) {
          return;
        }

        const suggestedCompanyName = prediction.types?.some((type: string) =>
          ["establishment", "point_of_interest", "premise"].includes(type),
        )
          ? prediction.structured_formatting?.main_text
          : undefined;

        stageOrApplyLocation(topResult, lat, lng, {
          fallbackAddress: prediction.description,
          googlePlaceId: prediction.place_id,
          suggestedCompanyName,
        });
      },
    );
  }

  async function handleUseCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationMessageTone("error");
      setLocationAccessMessage(copy.locationUnsupported);
      return;
    }

    locationAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    locationAbortControllerRef.current = abortController;
    setIsLocating(true);
    setPendingLocationConfirmation(null);
    setLocationAccuracyMeters(null);
    setLocationMessageTone("info");
    setLocationAccessMessage(null);

    try {
      const sample = await collectBestBrowserLocation(
        (bestSample, sampleCount) => {
          setLocationAccuracyMeters(bestSample.accuracyMeters);
          setLocationAccessMessage(
            copy.accuracyProgress(bestSample.accuracyMeters, sampleCount),
          );
        },
        abortController.signal,
      );

      if (sample.accuracyMeters > MAX_SETUP_LOCATION_ACCURACY_METERS) {
        setLocationMessageTone("error");
        setLocationAccessMessage(copy.accuracyRejected(sample.accuracyMeters));
        return;
      }

      setLocationMessageTone("success");
      setLocationAccuracyMeters(sample.accuracyMeters);
      setLocationAccessMessage(copy.accuracyAccepted(sample.accuracyMeters));
      const result = await reverseGeocodeLocation(
        sample.latitude,
        sample.longitude,
      );
      stageOrApplyLocation(result, sample.latitude, sample.longitude, {
        accuracyMeters: sample.accuracyMeters,
      });
    } catch (error) {
      if (abortController.signal.aborted) {
        return;
      }

      setLocationMessageTone("error");
      const errorCode =
        typeof error === "object" && error && "code" in error
          ? Number(error.code)
          : null;
      setLocationAccessMessage(
        errorCode === 1 ? copy.locationPermission : copy.locationFailed,
      );
    } finally {
      if (locationAbortControllerRef.current === abortController) {
        locationAbortControllerRef.current = null;
      }
      setIsLocating(false);
    }
  }

  return (
    <section className="org-map-shell">
      {isSetupMode && showCopy ? (
        <div className="org-map-copy">
          <strong>{copy.copyTitle}</strong>
          <p>{copy.copyBody}</p>
        </div>
      ) : null}

      {status === "missing_key" ? (
        <div className="org-map-state">{copy.missingKeyState}</div>
      ) : null}

      {status === "error" ? (
        <div className="org-map-state">{statusMessage || copy.mapsFailed}</div>
      ) : null}

      {isSetupMode ? (
        <div className="org-map-search-block">
          <div className="org-field">
            {searchLabel ? (
              <label className="org-field-label" htmlFor={searchInputId}>
                {searchLabel}
              </label>
            ) : null}
            <div className="org-map-search-control">
              <Input
                className={
                  searchTrailingContent
                    ? "org-map-search-input org-map-search-input--with-trailing"
                    : "org-map-search-input"
                }
                id={searchInputId}
                onChange={(event) => {
                  setSearchValue(event.target.value);
                  setPendingLocationConfirmation(null);
                  setLocationAccuracyMeters(null);
                  setLocationAccessMessage(null);
                }}
                placeholder={searchPlaceholder}
                value={searchValue}
              />
              {searchTrailingContent ? (
                <div className="org-map-search-trailing">
                  {searchTrailingContent}
                </div>
              ) : null}
            </div>
          </div>

          <div className="org-map-location-actions">
            <Button
              disabled={isLocating || status !== "ready"}
              onClick={() => void handleUseCurrentLocation()}
              size="sm"
              type="button"
              variant="outline"
            >
              <LocateFixed className="size-4" />
              {isLocating ? copy.locating : copy.currentLocation}
            </Button>
            {locationAccessMessage ? (
              <span
                className="org-map-location-message tabular-nums"
                data-tone={locationMessageTone}
              >
                {locationAccessMessage}
              </span>
            ) : null}
          </div>

          {pendingLocationConfirmation ? (
            <div
              className="org-map-confirmation"
              data-state={confirmationPhase}
              role="alert"
            >
              <div className="org-map-confirmation-copy">
                <strong>{copy.confirmLocationTitle}</strong>
                <p>{copy.confirmLocationBody}</p>
                <span className="tabular-nums">
                  {pendingLocationConfirmation.selection.address}
                  {typeof pendingLocationConfirmation.selection
                    .accuracyMeters === "number"
                    ? ` · ${copy.accuracyAccepted(
                        pendingLocationConfirmation.selection.accuracyMeters,
                      )}`
                    : ""}
                </span>
              </div>
              <div className="org-map-confirmation-actions">
                <Button
                  disabled={confirmationPhase !== "idle"}
                  onClick={() => void confirmPendingLocation()}
                  size="sm"
                  type="button"
                >
                  {confirmationPhase === "success" ||
                  confirmationPhase === "closing" ? (
                    <>
                      <Check className="size-4" />
                      {copy.locationSaved}
                    </>
                  ) : confirmationPhase === "saving" ? (
                    copy.savingLocation
                  ) : (
                    copy.confirmLocation
                  )}
                </Button>
                <Button
                  disabled={confirmationPhase !== "idle"}
                  onClick={dismissPendingLocation}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {copy.chooseAnotherLocation}
                </Button>
              </div>
            </div>
          ) : null}

          {suggestions.length ? (
            <div className="org-map-suggestions">
              {suggestions.map((prediction) => (
                <button
                  className="org-map-suggestion"
                  key={prediction.place_id}
                  onClick={() => handleSuggestionSelect(prediction)}
                  type="button"
                >
                  <strong>{prediction.structured_formatting?.main_text}</strong>
                  <span>
                    {prediction.structured_formatting?.secondary_text ??
                      prediction.description}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="org-map-canvas" ref={mapNodeRef} />
    </section>
  );
}
