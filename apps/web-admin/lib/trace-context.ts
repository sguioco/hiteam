function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  const crypto = globalThis.crypto;

  if (crypto?.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // This identifier only correlates telemetry; it is never an auth secret.
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return /^0+$/.test(value) ? `${"0".repeat(value.length - 1)}1` : value;
}

export function createTraceparent() {
  return `00-${randomHex(16)}-${randomHex(8)}-01`;
}

export function addTraceparentHeader(headers: Headers) {
  if (!headers.has("traceparent")) {
    headers.set("traceparent", createTraceparent());
  }
}
