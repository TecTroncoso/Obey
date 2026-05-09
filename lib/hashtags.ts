export function extractHashtags(text: string): string[] {
  const regex = /#[\w\u0590-\u05ff]+/g;
  const matches = text.match(regex);
  if (!matches) return [];
  return Array.from(new Set(matches.map(m => m.toLowerCase().replace('#', ''))));
}
