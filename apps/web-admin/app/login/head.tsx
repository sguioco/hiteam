const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000")
      .origin;
  } catch {
    return null;
  }
})();

export default function LoginHead() {
  return (
    <>
      {apiOrigin ? (
        <>
          <link crossOrigin="" href={apiOrigin} rel="preconnect" />
          <link href={apiOrigin} rel="dns-prefetch" />
        </>
      ) : null}
      <link
        as="image"
        href="/illustration.svg?v=20260409"
        rel="preload"
        type="image/svg+xml"
      />
    </>
  );
}
