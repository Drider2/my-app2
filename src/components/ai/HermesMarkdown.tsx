import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Haptics } from '../../services/haptics';

interface HermesMarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export const HermesMarkdown: React.FC<HermesMarkdownProps> = ({ content, isStreaming }) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopyCode = async (code: string, id: string) => {
    Haptics.tick();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
        setCopiedCodeId(id);
        setTimeout(() => setCopiedCodeId(null), 2000);
      }
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  // Helper to format inline elements: bold, italic, inline code, links
  const renderInline = (text: string): React.ReactNode => {
    // Regex for bold **text**, inline code `code`, link [label](url)
    const parts: React.ReactNode[] = [];
    let remainder = text;
    let keyIdx = 0;

    // Tokenizer regex
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/;

    while (remainder.length > 0) {
      const match = remainder.match(regex);
      if (!match || match.index === undefined) {
        parts.push(remainder);
        break;
      }

      if (match.index > 0) {
        parts.push(remainder.substring(0, match.index));
      }

      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={`b-${keyIdx++}`} className="font-bold text-[var(--color-text-primary)]">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code 
            key={`c-${keyIdx++}`} 
            className="px-1.5 py-0.5 rounded-md bg-white/[0.08] border border-white/[0.06] text-[var(--color-accent)] font-mono text-[11px]"
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
        const label = token.substring(1, token.indexOf(']('));
        const url = token.substring(token.indexOf('](') + 2, token.length - 1);
        parts.push(
          <a
            key={`a-${keyIdx++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
          >
            {label}
          </a>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={`i-${keyIdx++}`} className="italic text-[var(--color-text-secondary)]">
            {token.slice(1, -1)}
          </em>
        );
      } else {
        parts.push(token);
      }

      remainder = remainder.substring(match.index + token.length);
    }

    return parts;
  };

  // Block level parser: splits into code blocks, tables, lists, headers, paragraphs
  const renderBlocks = () => {
    const lines = content.split('\n');
    const blocks: React.ReactNode[] = [];
    let i = 0;
    let blockKey = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 1. Code blocks: ```
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim() || 'code';
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++; // skip closing ```
        
        const codeText = codeLines.join('\n');
        const codeId = `code-${blockKey++}`;

        blocks.push(
          <div 
            key={codeId} 
            className="my-2.5 rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[rgba(5,7,12,0.85)] text-left"
            dir="ltr"
          >
            <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-white/[0.08] bg-white/[0.03] text-[11px] text-[var(--color-text-secondary)]">
              <span className="font-mono uppercase font-semibold text-[10px] tracking-wider text-[var(--color-accent)]">
                {lang}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeText, codeId)}
                className="flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors p-1"
                aria-label="Copy code block"
              >
                {copiedCodeId === codeId ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-zinc-200">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        continue;
      }

      // 2. Markdown Tables: lines starting with |
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const headerCells = tableLines[0]
            .slice(1, -1)
            .split('|')
            .map(c => c.trim());

          // Skip separator line if present (e.g. |---|---|)
          const dataRows = tableLines.slice(1).filter(row => !row.replace(/[|\s-]/g, '').length === false);

          blocks.push(
            <div key={`table-${blockKey++}`} className="my-2.5 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-white/[0.02]">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-white/[0.04]">
                    {headerCells.map((h, hIdx) => (
                      <th key={`th-${hIdx}`} className="px-3 py-2 font-bold text-[var(--color-text-primary)]">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((r, rIdx) => {
                    const cells = r.slice(1, -1).split('|').map(c => c.trim());
                    return (
                      <tr key={`tr-${rIdx}`} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                        {cells.map((c, cIdx) => (
                          <td key={`td-${rIdx}-${cIdx}`} className="px-3 py-2 text-[var(--color-text-secondary)]">
                            {renderInline(c)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // 3. Headers: #, ##, ###
      if (line.startsWith('### ')) {
        blocks.push(
          <h3 key={`h3-${blockKey++}`} className="text-xs font-bold text-[var(--color-accent)] mt-3 mb-1">
            {renderInline(line.slice(4))}
          </h3>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        blocks.push(
          <h2 key={`h2-${blockKey++}`} className="text-sm font-bold text-[var(--color-text-primary)] mt-3.5 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
            <span>{renderInline(line.slice(3))}</span>
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith('# ')) {
        blocks.push(
          <h1 key={`h1-${blockKey++}`} className="text-sm font-extrabold text-[var(--color-text-primary)] mt-4 mb-2">
            {renderInline(line.slice(2))}
          </h1>
        );
        i++;
        continue;
      }

      // 4. Blockquotes: >
      if (line.startsWith('> ')) {
        blocks.push(
          <blockquote 
            key={`bq-${blockKey++}`} 
            className="my-2 border-l-2 border-[var(--color-accent)] pl-3 text-xs italic text-[var(--color-text-secondary)] bg-[var(--color-accent)]/5 py-1.5 rounded-r-xl"
          >
            {renderInline(line.slice(2))}
          </blockquote>
        );
        i++;
        continue;
      }

      // 5. Unordered list: - or *
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listItems: string[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
          listItems.push(lines[i].trim().slice(2));
          i++;
        }
        blocks.push(
          <ul key={`ul-${blockKey++}`} className="my-1.5 space-y-1 pl-4 list-disc marker:text-[var(--color-accent)] text-xs text-[var(--color-text-primary)]">
            {listItems.map((item, itemIdx) => (
              <li key={`li-${itemIdx}`} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // 6. Ordered list: 1. 2. 3.
      if (/^\d+\.\s/.test(line.trim())) {
        const listItems: string[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
          const match = lines[i].trim().match(/^\d+\.\s(.*)$/);
          if (match) listItems.push(match[1]);
          i++;
        }
        blocks.push(
          <ol key={`ol-${blockKey++}`} className="my-1.5 space-y-1 pl-4 list-decimal marker:text-[var(--color-accent)] marker:font-bold text-xs text-[var(--color-text-primary)]">
            {listItems.map((item, itemIdx) => (
              <li key={`oli-${itemIdx}`} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // 7. Regular paragraph / empty line
      if (!line.trim()) {
        blocks.push(<div key={`sp-${blockKey++}`} className="h-1" />);
      } else {
        blocks.push(
          <p key={`p-${blockKey++}`} className="text-xs leading-relaxed text-[var(--color-text-primary)] my-1">
            {renderInline(line)}
          </p>
        );
      }
      i++;
    }

    return blocks;
  };

  return (
    <div className="space-y-0.5 leading-relaxed break-words">
      {renderBlocks()}
      {isStreaming && (
        <span 
          className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-[var(--color-accent)] animate-pulse rounded-sm shadow-[0_0_8px_var(--color-accent)]" 
          aria-hidden="true" 
        />
      )}
    </div>
  );
};
