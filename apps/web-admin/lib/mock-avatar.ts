const SKIN_TONES = ["#f6d2b8", "#eabf9f", "#d8a07b", "#b97852"];
const HAIR_TONES = ["#2f231d", "#5b4232", "#8a5a3c", "#1f2430", "#6f4e37"];
const SHIRT_TONES = ["#284bff", "#4e8be7", "#3ea76b", "#ff8a3d", "#9b87f5"];
const BACKGROUNDS = [
  ["#eef2ff", "#d7f0df"],
  ["#f7efe6", "#d9ebff"],
  ["#efe8ff", "#ffe6da"],
  ["#e7f6ef", "#e8ecff"],
];

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getMockAvatarDataUrl(seed: string) {
  const normalizedSeed =
    typeof seed === "string" && seed.trim().length > 0 ? seed : "user";
  const hash = hashSeed(normalizedSeed);
  const skin = SKIN_TONES[hash % SKIN_TONES.length];
  const hair = HAIR_TONES[(hash >>> 3) % HAIR_TONES.length];
  const shirt = SHIRT_TONES[(hash >>> 5) % SHIRT_TONES.length];
  const background = BACKGROUNDS[(hash >>> 7) % BACKGROUNDS.length];
  const eyeOffset = 30 + ((hash >>> 9) % 4);
  const mouthCurve = 2 + ((hash >>> 11) % 4);
  const hairHeight = 24 + ((hash >>> 13) % 8);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
      <defs>
        <linearGradient id="bg" x1="14" y1="10" x2="82" y2="86" gradientUnits="userSpaceOnUse">
          <stop stop-color="${background[0]}"/>
          <stop offset="1" stop-color="${background[1]}"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="28" fill="url(#bg)"/>
      <path d="M16 96c3-20 17-31 32-31s29 11 32 31H16Z" fill="${shirt}"/>
      <ellipse cx="48" cy="40" rx="21" ry="23" fill="${skin}"/>
      <path d="M27 ${hairHeight + 2}c1-13 11-22 21-22 11 0 21 9 21 22v8c-4-5-9-8-14-8-8 0-12 5-28 6v-6Z" fill="${hair}"/>
      <path d="M33 60c4 5 9 8 15 8 6 0 11-3 15-8-2 12-12 20-15 20-4 0-13-8-15-20Z" fill="${shirt}" fill-opacity=".08"/>
      <circle cx="39" cy="${eyeOffset}" r="2.2" fill="#1c1c1c"/>
      <circle cx="57" cy="${eyeOffset}" r="2.2" fill="#1c1c1c"/>
      <path d="M41 48c2 2 4 3 7 3s5-1 7-3" stroke="#8a4f3d" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M40 58c2 ${mouthCurve} 4 ${mouthCurve + 1} 8 ${mouthCurve + 1}s6-1 8-${mouthCurve + 1}" stroke="#8a4f3d" stroke-width="2.2" stroke-linecap="round"/>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
