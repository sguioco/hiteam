import type { SupportMessage } from "./types";

let audioContext: AudioContext | null = null;
let warmedUp = false;

export function newIncomingMessages(previous: SupportMessage[], next: SupportMessage[]): SupportMessage[] {
  if (next.length <= previous.length) {
    return [];
  }
  return next.slice(previous.length).filter((message) => message.role !== "user");
}

function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!audioContext) {
    const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }
    audioContext = new AudioContextCtor();
  }
  return audioContext;
}

/** Resume audio output after a user gesture (browser autoplay policy). */
export function warmUpMessageSound(): void {
  if (warmedUp) {
    return;
  }
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  warmedUp = true;
}

function playBuiltInTone(): void {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended") {
    void ctx.resume().then(() => playBuiltInTone()).catch(() => {});
    return;
  }

  const start = ctx.currentTime;
  const tones: Array<{ frequency: number; at: number; duration: number }> = [
    { frequency: 880, at: 0, duration: 0.12 },
    { frequency: 1174.66, at: 0.14, duration: 0.16 },
  ];

  for (const tone of tones) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = tone.frequency;
    gain.gain.setValueAtTime(0.0001, start + tone.at);
    gain.gain.exponentialRampToValueAtTime(0.12, start + tone.at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.at + tone.duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start + tone.at);
    oscillator.stop(start + tone.at + tone.duration + 0.02);
  }
}

export function playMessageSound(customUrl?: string): void {
  if (customUrl) {
    const audio = new Audio(customUrl);
    audio.volume = 0.45;
    void audio.play().catch(() => {});
    return;
  }
  playBuiltInTone();
}

export function playSoundForNewIncoming(
  previous: SupportMessage[],
  next: SupportMessage[],
  options?: { enabled?: boolean; soundUrl?: string },
): void {
  if (options?.enabled === false) {
    return;
  }
  if (newIncomingMessages(previous, next).length === 0) {
    return;
  }
  playMessageSound(options?.soundUrl);
}
