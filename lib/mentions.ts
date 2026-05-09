export function extractMentions(text: string): string[] {
  const regex = /@([a-z0-9_]+)/g;
  const matches = text.match(regex);
  if (!matches) return [];
  return Array.from(new Set(matches.map(m => m.slice(1).toLowerCase())));
}
