export type DiffLine = { type: "same" | "added" | "removed"; text: string };

function splitLines(text: string): string[] {
  return text.length === 0 ? [] : text.split("\n");
}

/**
 * Line-level diff over the longest common subsequence.
 *
 * Chapters run to a few thousand lines at most, so the quadratic LCS table is
 * far cheaper than pulling in a diff library, and it keeps the comparison
 * dependency-free in line with the rest of the project.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);

  // lengths[i][j] = length of the LCS of a[i..] and b[j..]
  const lengths: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i][j] = a[i] === b[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      result.push({ type: "removed", text: a[i] });
      i++;
    } else {
      result.push({ type: "added", text: b[j] });
      j++;
    }
  }
  while (i < a.length) result.push({ type: "removed", text: a[i++] });
  while (j < b.length) result.push({ type: "added", text: b[j++] });

  return result;
}
