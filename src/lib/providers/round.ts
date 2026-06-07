// Normalize any provider's round label to an ordinal:
// 0 group, 1 R32, 2 R16, 3 QF, 4 SF, 5 Final. (Third-place play-off => 4, no scoring weight.)
export function roundOrdinal(label: string): number {
  const l = label.toLowerCase();
  if (l.includes("group")) return 0;
  if (l.includes("32")) return 1;
  if (l.includes("16")) return 2;
  if (l.includes("quarter")) return 3;
  if (l.includes("3rd place") || l.includes("third")) return 4;
  if (l.includes("semi")) return 4;
  if (l.includes("final")) return 5;
  return 0;
}
