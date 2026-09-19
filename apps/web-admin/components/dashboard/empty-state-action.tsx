type Action = { label: string } & ({ href: string; onClick?: never } | { onClick: () => void; href?: never });

export function EmptyStateAction({ action }: { action?: Action }) {
  if (!action) return null;
  const className = "mt-3 inline-flex rounded-xl border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600";
  return action.href !== undefined
    ? <a className={className} href={action.href}>{action.label}</a>
    : <button className={className} type="button" onClick={action.onClick}>{action.label}</button>;
}
