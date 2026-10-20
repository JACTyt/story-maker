export type EntityKind = "character" | "place" | "timeline" | "theme";

/** One bible entry as the matcher sees it: every name it may appear under. */
export type MentionEntity = { type: EntityKind; id: number; names: string[] };

export type Mention = { from: number; to: number; keys: string[] };

type Term = { text: string; keys: string[]; caseSensitive: boolean };

export type Matcher = { terms: Term[]; pattern: RegExp | null };

export const entityKey = (type: EntityKind, id: number) => `${type}:${id}`;

export function parseEntityKey(key: string): { type: EntityKind; id: number } {
  const [type, id] = key.split(":");
  return { type: type as EntityKind, id: Number(id) };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A capitalised name is matched case-sensitively, so "Will" the character is
 * not found in "you will"; an all-lowercase alias ("the harbour") matches in
 * any case. Themes are never auto-matched — their names rarely appear in prose.
 */
export function buildMatcher(entities: MentionEntity[]): Matcher {
  const byText = new Map<string, Term>();
  for (const entity of entities) {
    if (entity.type === "theme") continue;
    for (const raw of entity.names) {
      const text = raw.trim();
      if (!text) continue;
      const caseSensitive = /^\p{Lu}/u.test(text);
      const lookup = caseSensitive ? text : text.toLowerCase();
      const term = byText.get(lookup) ?? { text, keys: [], caseSensitive };
      const key = entityKey(entity.type, entity.id);
      if (!term.keys.includes(key)) term.keys.push(key);
      byText.set(lookup, term);
    }
  }
  const terms = [...byText.values()].sort((a, b) => b.text.length - a.text.length);
  if (terms.length === 0) return { terms, pattern: null };
  const alternation = terms.map((t) => escapeRegExp(t.text)).join("|");
  return { terms, pattern: new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternation})(?![\\p{L}\\p{N}_])`, "giu") };
}

function termFor(matcher: Matcher, hit: string): Term | undefined {
  const lower = hit.toLowerCase();
  return matcher.terms.find((t) => (t.caseSensitive ? t.text === hit : t.text.toLowerCase() === lower));
}

/** Plain-text mentions in order. Longest name wins at any position. */
export function findMentions(text: string, matcher: Matcher): Mention[] {
  if (!matcher.pattern) return [];
  const pattern = new RegExp(matcher.pattern.source, matcher.pattern.flags);
  const out: Mention[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const term = termFor(matcher, match[0]);
    if (!term) {
      // Matched a capitalised name in the wrong case; retry just past it so a
      // shorter, valid name starting here is not lost.
      pattern.lastIndex = match.index + 1;
      continue;
    }
    out.push({ from: match.index, to: match.index + match[0].length, keys: term.keys });
  }
  return out;
}

// ---------- entity links: [text](entity:type/id) and [text](entity:none) ----------

const ENTITY_HREF = /^entity:(?:(none)|(character|place|timeline|theme)\/(\d+))$/;
const ENTITY_LINK = /\[([^\]]*)\]\((entity:[^)\s]+)\)/g;

export function parseEntityHref(href: string): { type: EntityKind; id: number } | "none" | null {
  const m = ENTITY_HREF.exec(href.trim());
  if (!m) return null;
  if (m[1]) return "none";
  return { type: m[2] as EntityKind, id: Number(m[3]) };
}

export function entityHref(type: EntityKind, id: number): string {
  return `entity:${type}/${id}`;
}

/** For export and for any reader that should see plain prose. */
export function stripEntityLinks(markdown: string): string {
  return markdown.replace(ENTITY_LINK, "$1");
}

/**
 * Mentions per entity across markdown prose — the basis of "Appears in".
 * Manual links count for their target; their text (and suppressed spans) is
 * never auto-matched. Ambiguous names count for nobody until resolved.
 */
export function countMentions(markdown: string, matcher: Matcher): Map<string, number> {
  const counts = new Map<string, number>();
  const bump = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);

  const plain = markdown.replace(ENTITY_LINK, (_all, _text: string, href: string) => {
    const target = parseEntityHref(href);
    if (target && target !== "none") bump(entityKey(target.type, target.id));
    return " ";
  });

  for (const mention of findMentions(plain.replace(/[*_+>]/g, " "), matcher)) {
    if (mention.keys.length === 1) bump(mention.keys[0]);
  }
  return counts;
}
