export function cleanClassName(className: string): string {
  const primary = className.split(',')[0].trim();
  return primary
    .split(/\s+/)
    .map((word) =>
      word.length > 1 ? word[0].toUpperCase() + word.slice(1) : word.toUpperCase(),
    )
    .join(' ');
}
