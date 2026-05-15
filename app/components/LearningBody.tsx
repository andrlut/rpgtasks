import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

/**
 * Minimal markdown renderer scoped to what Learning material bodies actually
 * use. NOT a general-purpose engine — keeps full control over typography.
 *
 * Block-level syntax:
 *   # H1            — section break (rare; bodies usually start with prose)
 *   ## H2           — subsection
 *   ### H3          — sub-subsection
 *   - item          — bullet list (one item per line)
 *   > quote         — blockquote
 *   :::cta ...      — custom directive (handled by parent via onCtaPress)
 *   :::source[lbl](url) — small attribution row
 *   ![alt](url)     — image (future; not used in v0 seed)
 *   blank line      — paragraph break
 *
 * Inline syntax (within any text block):
 *   **bold**        — bolded run
 *   *italic*        — italicized run
 *   [text](url)     — tap-to-open link
 */

type Block =
  | { kind: 'h1'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'source'; label: string; url: string | null }
  | { kind: 'cta'; raw: string };

function parseBlocks(body: string): Block[] {
  const lines = body.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({ kind: 'h3', text: line.slice(4).trim() });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ kind: 'h2', text: line.slice(3).trim() });
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push({ kind: 'h1', text: line.slice(2).trim() });
      i++;
      continue;
    }

    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2).trim());
        i++;
      }
      blocks.push({ kind: 'list', items });
      continue;
    }

    if (line.startsWith('> ')) {
      const buf: string[] = [line.slice(2).trim()];
      i++;
      while (i < lines.length && lines[i].startsWith('> ')) {
        buf.push(lines[i].slice(2).trim());
        i++;
      }
      blocks.push({ kind: 'quote', text: buf.join(' ') });
      continue;
    }

    if (line.startsWith(':::source')) {
      // :::source[Label · 2024](https://...)
      const m = line.match(/^:::source\[([^\]]*)\](?:\(([^)]*)\))?\s*$/);
      blocks.push({
        kind: 'source',
        label: m?.[1]?.trim() ?? '',
        url: m?.[2]?.trim() || null,
      });
      i++;
      continue;
    }

    if (line.startsWith(':::cta')) {
      blocks.push({ kind: 'cta', raw: line });
      i++;
      continue;
    }

    // Default: a paragraph — join continuation lines until a blank line or
    // a block-prefix appears.
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ kind: 'p', text: buf.join(' ') });
  }

  return blocks;
}

function isBlockStart(line: string): boolean {
  return (
    line.startsWith('#') ||
    line.startsWith('- ') ||
    line.startsWith('> ') ||
    line.startsWith(':::')
  );
}

// ─── inline ───────────────────────────────────────────────────────────────

type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'link'; text: string; url: string };

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // Walk a regex that matches bold, italic, or link in order of precedence.
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) {
      tokens.push({ kind: 'text', text: text.slice(cursor, match.index) });
    }
    if (match[1] !== undefined) {
      tokens.push({ kind: 'bold', text: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ kind: 'italic', text: match[2] });
    } else if (match[3] !== undefined && match[4] !== undefined) {
      tokens.push({ kind: 'link', text: match[3], url: match[4] });
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    tokens.push({ kind: 'text', text: text.slice(cursor) });
  }
  return tokens;
}

function InlineText({ text, baseStyle }: { text: string; baseStyle?: object }) {
  const tokens = parseInline(text);
  return (
    <>
      {tokens.map((tok, idx) => {
        if (tok.kind === 'bold') {
          return (
            <Text key={idx} style={[baseStyle, styles.bold]}>
              {tok.text}
            </Text>
          );
        }
        if (tok.kind === 'italic') {
          return (
            <Text key={idx} style={[baseStyle, styles.italic]}>
              {tok.text}
            </Text>
          );
        }
        if (tok.kind === 'link') {
          return (
            <Text
              key={idx}
              style={[baseStyle, styles.link]}
              onPress={() => Linking.openURL(tok.url).catch(() => {})}
            >
              {tok.text}
            </Text>
          );
        }
        return (
          <Text key={idx} style={baseStyle}>
            {tok.text}
          </Text>
        );
      })}
    </>
  );
}

// ─── component ────────────────────────────────────────────────────────────

interface Props {
  body: string;
}

export function LearningBody({ body }: Props) {
  const blocks = React.useMemo(() => parseBlocks(body), [body]);

  return (
    <View style={styles.root}>
      {blocks.map((block, idx) => {
        switch (block.kind) {
          case 'h1':
            return (
              <Text key={idx} style={styles.h1}>
                <InlineText text={block.text} baseStyle={styles.h1} />
              </Text>
            );
          case 'h2':
            return (
              <Text key={idx} style={styles.h2}>
                <InlineText text={block.text} baseStyle={styles.h2} />
              </Text>
            );
          case 'h3':
            return (
              <Text key={idx} style={styles.h3}>
                <InlineText text={block.text} baseStyle={styles.h3} />
              </Text>
            );
          case 'p':
            return (
              <Text key={idx} style={styles.p}>
                <InlineText text={block.text} baseStyle={styles.p} />
              </Text>
            );
          case 'list':
            return (
              <View key={idx} style={styles.list}>
                {block.items.map((item, j) => (
                  <View key={j} style={styles.listItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.listItemText}>
                      <InlineText text={item} baseStyle={styles.listItemText} />
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'quote':
            return (
              <View key={idx} style={styles.quote}>
                <Text style={styles.quoteText}>
                  <InlineText text={block.text} baseStyle={styles.quoteText} />
                </Text>
              </View>
            );
          case 'source':
            return (
              <View key={idx} style={styles.source}>
                <Text style={styles.sourceLabel}>{block.label}</Text>
                {block.url && (
                  <Text
                    style={styles.sourceLink}
                    onPress={() => block.url && Linking.openURL(block.url).catch(() => {})}
                  >
                    {block.url}
                  </Text>
                )}
              </View>
            );
          case 'cta':
            // CTAs are surfaced by the parent screen (it has the routing
            // context). For now we just skip them inline — the parent renders
            // a CTA card based on the material's `cta_action`.
            return null;
          default:
            return null;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  h1: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    lineHeight: 32,
    color: tokens.text.hi,
    marginTop: 12,
    marginBottom: 4,
  },
  h2: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    lineHeight: 24,
    color: tokens.text.hi,
    marginTop: 16,
    marginBottom: 2,
  },
  h3: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    lineHeight: 21,
    color: tokens.text.base,
    marginTop: 12,
    marginBottom: 2,
  },
  p: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 24,
    color: tokens.text.base,
  },
  bold: {
    fontFamily: 'Manrope_700Bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  link: {
    color: tokens.brand.violet2,
    textDecorationLine: 'underline',
  },
  list: {
    gap: 6,
    paddingLeft: 4,
  },
  listItem: {
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    lineHeight: 24,
    color: tokens.brand.violet2,
    width: 14,
  },
  listItemText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 24,
    color: tokens.text.base,
  },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: tokens.brand.violet2,
    paddingLeft: 14,
    marginVertical: 4,
  },
  quoteText: {
    fontFamily: 'Manrope_500Medium',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 23,
    color: tokens.text.mid,
  },
  source: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: tokens.border.divider,
    gap: 2,
  },
  sourceLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: tokens.text.mid,
  },
  sourceLink: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.brand.violet2,
    textDecorationLine: 'underline',
  },
});
