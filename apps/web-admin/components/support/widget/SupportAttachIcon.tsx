type SupportAttachIconProps = {
  className?: string;
};

export function SupportAttachIcon({ className }: SupportAttachIconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
