import type { SourceArticle } from '../types/index';

interface CitedTextProps {
  text: string;
  sources: SourceArticle[];
  className?: string;
}

/**
 * Renders text with [N] citation markers as clickable superscript links.
 */
export function CitedText({ text, sources, className }: CitedTextProps) {
  if (!text) return null;

  // Split on citation markers like [1], [2], [12], etc.
  const parts = text.split(/(\[\d+\])/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const idx = parseInt(match[1], 10) - 1; // 1-indexed to 0-indexed
          const article = sources[idx];
          if (article?.url) {
            return (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`${article.source}: ${article.title}`}
                style={{
                  color: 'var(--color-primary)',
                  fontSize: '0.75em',
                  verticalAlign: 'super',
                  textDecoration: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
              >
                [{match[1]}]
              </a>
            );
          }
          // No matching article — render as plain text
          return <span key={i} style={{ color: 'var(--color-muted)', fontSize: '0.75em', verticalAlign: 'super' }}>[{match[1]}]</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
