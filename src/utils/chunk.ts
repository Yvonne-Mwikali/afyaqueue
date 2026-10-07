/** Splits a list into consecutive groups of `size` (the last may be shorter). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}
