export type AltegioMarketplaceStatus = {
  activatedAt?: string | null;
  applicationId?: string | null;
  connected: boolean;
  locationId?: string | null;
};

export type AltegioPilotLocationSummary = {
  altegioLocationId: string;
  id: string;
  name: string;
};

export type AltegioPilotStatus = {
  connected: boolean;
  locations: AltegioPilotLocationSummary[];
};

export function resolveAltegioIntegrationView(
  marketplace: AltegioMarketplaceStatus | null | undefined,
  pilot: AltegioPilotStatus | null | undefined,
) {
  const pilotLocations = pilot?.locations ?? [];
  const pilotLabels = pilotLocations.map((location) => location.name).filter(Boolean);

  if (marketplace?.connected) {
    const marketplaceLocationId = marketplace.locationId?.trim() || null;
    const matchedPilot = marketplaceLocationId
      ? pilotLocations.find((location) => location.altegioLocationId === marketplaceLocationId)
      : null;
    const marketplaceLabel = matchedPilot?.name
      ?? (marketplaceLocationId ? `salon ${marketplaceLocationId}` : null);

    if (pilotLabels.length > 0) {
      return {
        connected: true,
        locationLabel: pilotLabels.join(", "),
        marketplaceConnected: true,
        pilotConnected: true,
      };
    }

    return {
      connected: true,
      locationLabel: marketplaceLabel,
      marketplaceConnected: true,
      pilotConnected: false,
    };
  }

  if (pilotLabels.length > 0) {
    return {
      connected: true,
      locationLabel: pilotLabels.join(", "),
      marketplaceConnected: false,
      pilotConnected: true,
    };
  }

  return {
    connected: false,
    locationLabel: null,
    marketplaceConnected: false,
    pilotConnected: false,
  };
}

export function formatAltegioIntegrationSubtitle(
  view: ReturnType<typeof resolveAltegioIntegrationView>,
  locale: "en" | "ru",
) {
  if (!view.connected || !view.locationLabel) {
    return locale === "ru"
      ? "Синхронизация HiTeam с вашим салоном"
      : "Sync HiTeam with your location";
  }

  if (view.marketplaceConnected) {
    return locale === "ru"
      ? `Сотрудники и расписание · ${view.locationLabel}`
      : `Staff and schedule · ${view.locationLabel}`;
  }

  return locale === "ru"
    ? `Подключено · ${view.locationLabel}`
    : `Connected · ${view.locationLabel}`;
}
