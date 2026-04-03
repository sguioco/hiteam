const MALE_AVATARS = [
  "https://www.untitledui.com/images/avatars/transparent/ethan-valdez?bg=%23E0E0E0",
  "https://www.untitledui.com/images/avatars/transparent/franklin-mays?bg=%23E0E0E0",
  "https://www.untitledui.com/images/avatars/transparent/jackson-reed?bg=%23E0E0E0",
  "https://www.untitledui.com/images/avatars/transparent/jordan-burgess?bg=%23E0E0E0",
  "https://www.untitledui.com/images/avatars/transparent/liam-hood?bg=%23E0E0E0",
] as const;

const FEMALE_AVATARS = [
  "https://www.untitledui.com/images/avatars/transparent/levi-rocha?bg=%23E0E0E0",
  "https://www.untitledui.com/images/avatars/transparent/kate-morrison?bg=%23E0E0E0",
  "https://www.untitledui.com/images/avatars/transparent/nicola-harris?bg=%23E0E0E0",
  "https://www.untitledui.com/images/avatars/transparent/olivia-rhye?bg=%23E0E0E0",
  "https://www.untitledui.com/images/avatars/transparent/rhea-levine?bg=%23E0E0E0",
] as const;

const AVATAR_OVERRIDES: Record<string, string> = {
  sidorov:
    "https://www.untitledui.com/images/avatars/transparent/orlando-diggs?bg=%23E0E0E0",
  morozov:
    "https://www.untitledui.com/images/avatars/transparent/owen-garcia?bg=%23E0E0E0",
};

const FEMALE_NAME_HINTS = new Set([
  "anna",
  "maria",
  "olivia",
  "emma",
  "ava",
  "sofia",
  "grace",
  "kate",
  "nicola",
  "rhea",
  "levi",
  "анна",
  "мария",
  "ольга",
  "екатерина",
  "смирнова",
  "петрова",
  "андреева",
  "лебедева",
  "егорова",
]);

type MockAvatarGender = "male" | "female";

function extractPrimaryNameToken(seed: string) {
  return (
    seed
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^A-Za-zА-Яа-яЁё-]/g, "")
      .toLowerCase() ?? ""
  );
}

function inferGenderFromSurname(seed: string): MockAvatarGender | null {
  const token = extractPrimaryNameToken(seed);

  if (!token) {
    return null;
  }

  const femaleSurnamePattern =
    /(ова|ева|ёва|ина|ына|ская|цкая|ая|яя|ova|eva|ina|yna|skaya|tskaya|aya)$/;
  const maleSurnamePattern =
    /(ов|ев|ёв|ин|ын|ский|цкий|ой|ий|ov|ev|in|yn|sky|skiy|tsky|oy|iy)$/;

  if (femaleSurnamePattern.test(token)) {
    return "female";
  }

  if (maleSurnamePattern.test(token)) {
    return "male";
  }

  return null;
}

function inferGenderFromFirstName(seed: string): MockAvatarGender | null {
  const token =
    seed
      .trim()
      .split(/\s+/)
      .find((part) => /^[A-Za-zА-Яа-яЁё-]+$/.test(part))
      ?.replace(/[^A-Za-zА-Яа-яЁё-]/g, "")
      .toLowerCase() ?? "";

  if (!token) {
    return null;
  }

  const femaleFirstNames = new Set([
    "анна",
    "мария",
    "ольга",
    "екатерина",
    "елена",
    "алёна",
    "алена",
    "наталья",
    "татьяна",
    "светлана",
    "ирина",
    "анастасия",
    "юлия",
    "лилия",
    "ольга",
    "emma",
    "olivia",
    "mia",
    "ava",
    "grace",
    "sofia",
    "sophia",
    "kate",
    "nicola",
    "rhea",
  ]);

  const maleFirstNames = new Set([
    "илья",
    "дмитрий",
    "алексей",
    "игорь",
    "павел",
    "иван",
    "сергей",
    "андрей",
    "михаил",
    "николай",
    "орлов",
    "john",
    "alex",
    "noah",
    "james",
    "lucas",
    "liam",
    "ethan",
    "owen",
    "orlando",
  ]);

  if (femaleFirstNames.has(token)) {
    return "female";
  }

  if (maleFirstNames.has(token)) {
    return "male";
  }

  return null;
}

export function resolveMockAvatarGender(
  seed: string,
  genderHint?: MockAvatarGender | null,
): MockAvatarGender {
  if (genderHint === "male" || genderHint === "female") {
    return genderHint;
  }

  const surnameGender = inferGenderFromSurname(seed);
  if (surnameGender) {
    return surnameGender;
  }

  const firstNameGender = inferGenderFromFirstName(seed);
  if (firstNameGender) {
    return firstNameGender;
  }

  const normalizedSeed =
    typeof seed === "string" && seed.trim().length > 0 ? seed : "user";
  const hash = hashSeed(normalizedSeed);
  const hasFemaleNameHint = Array.from(FEMALE_NAME_HINTS).some((hint) =>
    normalizedSeed.toLowerCase().includes(hint),
  );

  if (hasFemaleNameHint) {
    return "female";
  }

  return hash % 2 === 0 ? "male" : "female";
}

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getMockAvatarDataUrl(
  seed: string,
  genderHint?: MockAvatarGender | null,
) {
  const normalizedSeed =
    typeof seed === "string" && seed.trim().length > 0 ? seed : "user";
  const primaryToken = extractPrimaryNameToken(normalizedSeed);
  const directOverride = primaryToken ? AVATAR_OVERRIDES[primaryToken] : null;

  if (directOverride) {
    return directOverride;
  }

  const hash = hashSeed(normalizedSeed);
  const gender = resolveMockAvatarGender(normalizedSeed, genderHint);
  const pool = gender === "female" ? FEMALE_AVATARS : MALE_AVATARS;
  return pool[hash % pool.length];
}
