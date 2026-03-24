import type { ImageSourcePropType } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const LOCAL_AVATARS = {
  female: [
    require("../assets/avatars/1.jpg"),
    require("../assets/avatars/3.jpg"),
  ],
  male: [
    require("../assets/avatars/2.jpg"),
    require("../assets/avatars/4.jpg"),
    require("../assets/avatars/5.jpg"),
  ],
} satisfies Record<"female" | "male", ImageSourcePropType[]>;

type AvatarCandidate = {
  avatar?: unknown;
  avatarUrl?: unknown;
  email?: string | null;
  employeeNumber?: string | null;
  firstName?: string | null;
  gender?: string | null;
  id?: string | null;
  lastName?: string | null;
};

const KNOWN_FEMALE_NAMES = new Set([
  "alina",
  "anna",
  "daria",
  "elena",
  "irina",
  "julia",
  "maria",
  "marina",
  "olga",
  "polina",
  "sofia",
  "svetlana",
  "yulia",
  "алена",
  "алина",
  "анна",
  "дарья",
  "елена",
  "ирина",
  "мария",
  "марина",
  "ольга",
  "полина",
  "софия",
  "светлана",
  "юлия",
]);

const KNOWN_MALE_NAMES = new Set([
  "alexander",
  "artem",
  "denis",
  "ilya",
  "maksim",
  "maxim",
  "nikita",
  "roman",
  "sergey",
  "артем",
  "денис",
  "илья",
  "максим",
  "никита",
  "роман",
  "сергей",
  "александр",
]);

function hashSeed(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function buildSeed(seedParts: Array<string | null | undefined>) {
  return seedParts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(":");
}

function pickAvatar(
  pool: ImageSourcePropType[],
  seedParts: Array<string | null | undefined>,
) {
  const seed = buildSeed(seedParts);

  if (!seed) {
    return pool[0];
  }

  return pool[hashSeed(seed) % pool.length];
}

function normalizeToken(value: string | null | undefined) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-zа-яё]/g, "");
}

function inferGenderFromName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) {
  const normalizedFirstName = normalizeToken(firstName);
  const normalizedLastName = normalizeToken(lastName);

  if (normalizedFirstName && KNOWN_FEMALE_NAMES.has(normalizedFirstName)) {
    return "female" as const;
  }

  if (normalizedFirstName && KNOWN_MALE_NAMES.has(normalizedFirstName)) {
    return "male" as const;
  }

  if (
    normalizedLastName &&
    (normalizedLastName.endsWith("ova") ||
      normalizedLastName.endsWith("eva") ||
      normalizedLastName.endsWith("ina") ||
      normalizedLastName.endsWith("aya") ||
      normalizedLastName.endsWith("skaya") ||
      normalizedLastName.endsWith("ова") ||
      normalizedLastName.endsWith("ева") ||
      normalizedLastName.endsWith("ина") ||
      normalizedLastName.endsWith("ая") ||
      normalizedLastName.endsWith("ская"))
  ) {
    return "female" as const;
  }

  if (
    normalizedFirstName &&
    (normalizedFirstName.endsWith("ina") ||
      normalizedFirstName.endsWith("iya") ||
      normalizedFirstName.endsWith("ya") ||
      normalizedFirstName.endsWith("a") ||
      normalizedFirstName.endsWith("ия") ||
      normalizedFirstName.endsWith("ья") ||
      normalizedFirstName.endsWith("я") ||
      normalizedFirstName.endsWith("а"))
  ) {
    return "female" as const;
  }

  return "male" as const;
}

function fallbackAvatar(seedParts: Array<string | null | undefined>) {
  return pickAvatar(LOCAL_AVATARS.female, seedParts);
}

function genderFallbackAvatar(
  gender: string | null | undefined,
  seedParts: Array<string | null | undefined>,
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) {
  const normalizedGender = gender?.trim().toLowerCase();

  if (normalizedGender === "male") {
    return pickAvatar(LOCAL_AVATARS.male, seedParts);
  }

  if (normalizedGender === "female") {
    return fallbackAvatar(seedParts);
  }

  return inferGenderFromName(firstName, lastName) === "female"
    ? fallbackAvatar(seedParts)
    : pickAvatar(LOCAL_AVATARS.male, seedParts);
}

function remoteAvatarSource(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return {
    uri: normalizeRemoteAvatarUrl(trimmed),
  } satisfies ImageSourcePropType;
}

function isLocalAvatarHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized === "host.docker.internal"
  );
}

function normalizeRemoteAvatarUrl(value: string) {
  try {
    const avatarUrl = new URL(value);

    if (!isLocalAvatarHost(avatarUrl.hostname) || !API_URL.trim()) {
      return avatarUrl.toString();
    }

    const apiUrl = new URL(API_URL);
    avatarUrl.protocol = apiUrl.protocol;
    avatarUrl.hostname = apiUrl.hostname;

    if (!avatarUrl.port && apiUrl.port) {
      avatarUrl.port = apiUrl.port;
    }

    return avatarUrl.toString();
  } catch {
    return value;
  }
}

export function resolveEmployeeAvatarSource(
  candidate: AvatarCandidate,
): ImageSourcePropType {
  const fallbackSeedParts = [
    candidate.id,
    candidate.employeeNumber,
    candidate.email,
    candidate.firstName,
    candidate.lastName,
  ];

  if (typeof candidate.avatar === "number") {
    return candidate.avatar;
  }

  if (
    candidate.avatar &&
    typeof candidate.avatar === "object" &&
    "uri" in candidate.avatar &&
    typeof (candidate.avatar as { uri?: unknown }).uri === "string"
  ) {
    return candidate.avatar as ImageSourcePropType;
  }

  if (typeof candidate.avatar === "string") {
    const source = remoteAvatarSource(candidate.avatar);
    if (source) {
      return source;
    }
  }

  if (typeof candidate.avatarUrl === "string") {
    const source = remoteAvatarSource(candidate.avatarUrl);
    if (source) {
      return source;
    }
  }

  return genderFallbackAvatar(
    candidate.gender,
    fallbackSeedParts,
    candidate.firstName,
    candidate.lastName,
  );
}
