"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

declare global {
  interface Window {
    google?: any;
    __smartGoogleMapsInit?: () => void;
    __smartGoogleMapsLoader?: Promise<any>;
  }
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
  mode?: "preview" | "setup";
  longitude: string;
  onSelect: (next: LocationSelection) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  showCopy?: boolean;
};

const DEFAULT_LATITUDE = 55.0302;
const DEFAULT_LONGITUDE = 82.9204;
const SCRIPT_ID = "smart-google-maps-api";

function parseCoordinate(value: string, fallback: number) {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hasCoordinateValue(value: string) {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value));
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

export function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Maps is only available in the browser."),
    );
  }

  if (window.google?.maps?.places || window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google.maps);
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

        resolve(maps);
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
  longitude,
  mode = "setup",
  onSelect,
  searchLabel = "Адрес организации",
  searchPlaceholder = "Например, Новосибирск, Красный проспект 25",
  showCopy = true,
}: LocationMapPickerProps) {
  const autocompleteServiceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const circleRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onSelectRef = useRef(onSelect);
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
  const [locationAccessMessage, setLocationAccessMessage] = useState<string | null>(
    null,
  );
  const isSetupMode = mode === "setup";

  function syncGeofenceCircle() {
    if (!mapRef.current || !window.google?.maps) return;

    const lat = parseCoordinate(latitude, DEFAULT_LATITUDE);
    const lng = parseCoordinate(longitude, DEFAULT_LONGITUDE);
    const hasCoords = hasCoordinateValue(latitude) && hasCoordinateValue(longitude);
    const radius = geofenceRadiusMeters;

    if (!hasCoords || !radius || radius <= 0) {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      return;
    }

    if (circleRef.current) {
      circleRef.current.setCenter({ lat, lng });
      circleRef.current.setRadius(radius);
      circleRef.current.setMap(mapRef.current);
      return;
    }

    circleRef.current = new window.google.maps.Circle({
      map: mapRef.current,
      center: { lat, lng },
      radius,
      fillColor: "#7c3aed",
      fillOpacity: 0.10,
      strokeColor: "#7c3aed",
      strokeOpacity: 0.5,
      strokeWeight: 2,
      clickable: false,
    });
  }

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

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
      setStatusMessage(
        "Добавь NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, чтобы включить карту и подсказки адресов.",
      );
      return;
    }

    const resolvedApiKey: string = googleMapsApiKey;
    let cancelled = false;

    async function initMap() {
      try {
        setStatus("loading");
        setStatusMessage(null);
        const maps = await loadGoogleMaps(resolvedApiKey);
        if (cancelled || !mapNodeRef.current) return;

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
          mapRef.current = new maps.Map(mapNodeRef.current, {
            center,
            zoom: 15,
            disableDefaultUI: true,
            gestureHandling: "greedy",
            clickableIcons: false,
            zoomControl: true,
            streetViewControl: false,
            fullscreenControl: false,
            mapTypeControl: false,
          });

          markerRef.current = new maps.Marker({
            map: mapRef.current,
            position: center,
            draggable: isSetupMode,
          });

          if (isSetupMode) {
            mapRef.current.addListener("click", (event: any) => {
              const lat = event.latLng?.lat?.();
              const lng = event.latLng?.lng?.();
              if (typeof lat !== "number" || typeof lng !== "number") return;

              markerRef.current?.setPosition({ lat, lng });
              onSelectRef.current({
                address: searchValue || address,
                latitude: lat.toFixed(6),
                longitude: lng.toFixed(6),
              });
              reverseGeocode(lat, lng);
            });

            markerRef.current.addListener("dragend", (event: any) => {
              const lat = event.latLng?.lat?.();
              const lng = event.latLng?.lng?.();
              if (typeof lat !== "number" || typeof lng !== "number") return;

              onSelectRef.current({
                address: searchValue || address,
                latitude: lat.toFixed(6),
                longitude: lng.toFixed(6),
              });
              reverseGeocode(lat, lng);
            });
          }
        }

        const focusMap = (nextCenter: { lat: number; lng: number }, zoom: number) => {
          window.setTimeout(() => {
            if (cancelled || !mapRef.current) return;
            maps.event?.trigger?.(mapRef.current, "resize");
            mapRef.current.setCenter(nextCenter);
            mapRef.current.setZoom(zoom);
          }, 120);
        };

        markerRef.current?.setDraggable(isSetupMode);
        markerRef.current?.setPosition(center);
        mapRef.current?.setCenter(center);
        syncGeofenceCircle();
        focusMap(center, hasCoordinates ? 16 : 13);
        setStatus("ready");

        if (geocoderRef.current && hasCoordinates) {
          reverseGeocode(Number(latitude), Number(longitude));
        }
      } catch {
        if (!cancelled) {
          setStatusMessage(
            "Google Maps не инициализировался. Обычно это значит, что у ключа не включён Places API (New), Maps JavaScript API или ключ ограничен для localhost.",
          );
          setStatus("error");
        }
      }
    }

    function applyGeocodeResult(
      result: any,
      lat: number,
      lng: number,
      options?: { googlePlaceId?: string; suggestedCompanyName?: string },
    ) {
      const details = getAddressDetails(result);
      const nextLatitude = lat.toFixed(6);
      const nextLongitude = lng.toFixed(6);

      setAddressDetails(details);
      skipAutocompleteRef.current = true;
      setSearchValue(result.formatted_address ?? "");
      setSuggestions([]);

      onSelectRef.current({
        address: result.formatted_address,
        details,
        googlePlaceId: options?.googlePlaceId,
        latitude: nextLatitude,
        longitude: nextLongitude,
        suggestedCompanyName: options?.suggestedCompanyName,
      });
    }

    function reverseGeocode(lat: number, lng: number) {
      geocoderRef.current?.geocode(
        { location: { lat, lng } },
        (results: any[], geocodeStatus: string) => {
          if (cancelled) return;
          const topResult = results?.[0];

          if (geocodeStatus === "OK" && topResult) {
            applyGeocodeResult(topResult, lat, lng);
            return;
          }

          onSelectRef.current({
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6),
          });
        },
      );
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

    const center = {
      lat: parseCoordinate(latitude, DEFAULT_LATITUDE),
      lng: parseCoordinate(longitude, DEFAULT_LONGITUDE),
    };

    markerRef.current.setPosition(center);
    mapRef.current.setCenter(center);
    mapRef.current.setZoom(16);
    window.setTimeout(() => {
      window.google?.maps?.event?.trigger?.(mapRef.current, "resize");
      mapRef.current?.setCenter(center);
    }, 80);
  }, [latitude, longitude]);

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

        markerRef.current?.setPosition({ lat, lng });
        mapRef.current?.setCenter({ lat, lng });
        mapRef.current?.setZoom(16);

        const details = getAddressDetails(topResult);
        setAddressDetails(details);
        skipAutocompleteRef.current = true;
        setSearchValue(topResult.formatted_address ?? address);

        onSelectRef.current({
          address: topResult.formatted_address,
          details,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
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

    geocoderRef.current.geocode(
      { location: { lat, lng } },
      (results: any[], geocodeStatus: string) => {
        const topResult = results?.[0];

        if (geocodeStatus !== "OK" || !topResult) {
          return;
        }

        const details = getAddressDetails(topResult);
        skipAutocompleteRef.current = true;
        setAddressDetails(details);
        setSearchValue(topResult.formatted_address ?? "");

        onSelectRef.current({
          address: topResult.formatted_address,
          details,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        });
      },
    );
  }, [isSetupMode, latitude, longitude, status]);

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

        markerRef.current?.setPosition({ lat, lng });
        mapRef.current?.setCenter({ lat, lng });

        const details = getAddressDetails(topResult);
        setAddressDetails(details);
        skipAutocompleteRef.current = true;
        setSearchValue(
          topResult.formatted_address ?? prediction.description ?? "",
        );
        setSuggestions([]);

        onSelectRef.current({
          address: topResult.formatted_address,
          details,
          googlePlaceId: prediction.place_id,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
          suggestedCompanyName,
        });
      },
    );
  }

  function handleUseCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationAccessMessage(
        "Браузер не поддерживает определение текущего местоположения.",
      );
      return;
    }

    setIsLocating(true);
    setLocationAccessMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const nextPosition = { lat, lng };

        markerRef.current?.setPosition(nextPosition);
        mapRef.current?.setCenter(nextPosition);
        mapRef.current?.setZoom(16);

        geocoderRef.current?.geocode(
          { location: nextPosition },
          (results: any[], geocodeStatus: string) => {
            setIsLocating(false);

            const topResult = results?.[0];
            if (geocodeStatus === "OK" && topResult) {
              const details = getAddressDetails(topResult);

              setAddressDetails(details);
              skipAutocompleteRef.current = true;
              setSearchValue(topResult.formatted_address ?? "");
              setSuggestions([]);

              onSelectRef.current({
                address: topResult.formatted_address,
                details,
                latitude: lat.toFixed(6),
                longitude: lng.toFixed(6),
              });
              return;
            }

            onSelectRef.current({
              latitude: lat.toFixed(6),
              longitude: lng.toFixed(6),
            });
          },
        );
      },
      (error) => {
        setIsLocating(false);
        setLocationAccessMessage(
          error.code === error.PERMISSION_DENIED
            ? "Разрешите доступ к геолокации в браузере, чтобы поставить точку по текущему местоположению."
            : "Не удалось определить текущее местоположение.",
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    );
  }

  return (
    <section className="org-map-shell">
      {isSetupMode && showCopy ? (
        <div className="org-map-copy">
          <strong>Адрес компании</strong>
          <p>
            Начни вводить город или адрес. Можно выбрать подсказку Google или
            поставить точку прямо на карте.
          </p>
        </div>
      ) : null}

      {status === "missing_key" ? (
        <div className="org-map-state">
          Добавь `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, чтобы включить Google Maps,
          подсказки адресов и обратный геокодинг.
        </div>
      ) : null}

      {status === "error" ? (
        <div className="org-map-state">
          {statusMessage ||
            "Не удалось загрузить Google Maps API. Проверь API key и включённые сервисы."}
        </div>
      ) : null}

      {isSetupMode ? (
        <div className="org-map-search-block">
          <label className="org-field" htmlFor={searchInputId}>
            <span>{searchLabel}</span>
            <Input
              id={searchInputId}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={searchPlaceholder}
              value={searchValue}
            />
          </label>

          <div className="org-map-location-actions">
            <Button
              disabled={isLocating || status !== "ready"}
              onClick={handleUseCurrentLocation}
              size="sm"
              type="button"
              variant="outline"
            >
              <LocateFixed className="size-4" />
              {isLocating ? "Определяем..." : "Моё местоположение"}
            </Button>
            {locationAccessMessage ? (
              <span className="org-map-location-message">
                {locationAccessMessage}
              </span>
            ) : null}
          </div>

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
