import { cn } from "@/lib/utils";

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span aria-label="HiTeam" className={cn("brand-wordmark", className)}>
      <span className="brand-wordmark-hi">Hi</span>
      <span className="brand-wordmark-team">Team</span>
      <img
        alt=""
        aria-hidden="true"
        className="brand-wordmark-wave"
        src="/waving-hand-skin-1.svg"
      />
    </span>
  );
}
