/** Selection is limited to the currently visible directory result. */
export function retainVisibleEmployees(selected: Set<string>, visibleIds: string[]) {
  const visible = new Set(visibleIds);
  const next = new Set([...selected].filter(id => visible.has(id)));
  return next.size === selected.size ? selected : next;
}
