import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

/**
 * Scoped markdown-with-directives renderer for Learning material bodies.
 * Not a general-purpose engine — kept narrow on purpose so each block has
 * its own designed component instead of generic HTML-shaped output.
 *
 * Block-level syntax:
 *   # / ## / ###     headings
 *   - item           bullet list (one item per line, contiguous)
 *   > quote          inline blockquote (one or more lines)
 *   blank line       paragraph break
 *
 * Single-line directives:
 *   :::source[lbl](url)               source attribution row
 *
 * Fenced directives (opening line, content lines, then standalone "::: "):
 *   :::stat[68%]                      big-number stat block
 *     short label below the number
 *   :::
 *
 *   :::quote{author="X", source="Y"}  pull quote
 *     The quote body, multi-line ok.
 *   :::
 *
 *   :::callout{kind=warn|info|tip|love}  colored callout with icon
 *     Body of the callout.
 *   :::
 *
 *   :::compare{leftTitle="A", rightTitle="B"}  side-by-side comparison
 *     left | text for the left column
 *     right | text for the right column
 *   :::
 *
 *   :::list-icon                       list where each item has its own icon
 *     moon | Bed at the same time every day.
 *     flame | No caffeine after 14h.
 *   :::
 *
 *   :::progress[val=68 of=100]        progress bar with a one-line label
 *     of adults sleeping < 7h
 *   :::
 *
 *   :::ex                              "for example" callout box
 *     A 28-year-old shifted dinner from 22h to 19h…
 *   :::
 *
 * Inline (within any text block):
 *   **bold**        — bolded run
 *   *italic*        — italicized run
 *   [text](url)     — tap-to-open link
 */

// ─── block ast ────────────────────────────────────────────────────────────

type CalloutKind = 'warn' | 'info' | 'tip' | 'love';

interface CompareSide {
  title?: string;
  text: string;
}

type Block =
  | { kind: 'h1'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'source'; label: string; url: string | null }
  | { kind: 'stat'; value: string; label: string }
  | { kind: 'pull-quote'; author: string | null; source: string | null; text: string }
  | { kind: 'callout'; tone: CalloutKind; text: string }
  | { kind: 'compare'; left: CompareSide; right: CompareSide }
  | { kind: 'list-icon'; items: { icon: string; text: string }[] }
  | { kind: 'progress'; value: number; max: number; label: string }
  | { kind: 'ex'; text: string };

// ─── parsing ──────────────────────────────────────────────────────────────

function isFenceStart(line: string): string | null {
  if (!line.startsWith(':::')) return null;
  // Standalone ":::" closes a fence; we don't treat it as a starter.
  if (line.trim() === ':::') return null;
  return line.slice(3).trim();
}

function parseFenceHeader(header: string): {
  name: string;
  inline: string | null;
  params: Record<string, string>;
} {
  // header looks like:  name[inline-content]{key="value", key=value}
  // or just: name
  // or: name[inline]
  // or: name{key=v}
  let cursor = 0;
  let name = '';
  while (cursor < header.length && /[a-zA-Z0-9-]/.test(header[cursor])) {
    name += header[cursor];
    cursor++;
  }
  let inline: string | null = null;
  if (header[cursor] === '[') {
    const end = header.indexOf(']', cursor);
    if (end > -1) {
      inline = header.slice(cursor + 1, end);
      cursor = end + 1;
    }
  }
  const params: Record<string, string> = {};
  if (header[cursor] === '{') {
    const end = header.indexOf('}', cursor);
    if (end > -1) {
      const body = header.slice(cursor + 1, end);
      // Split on commas not inside quotes
      const parts = body.match(/(?:[^,"']|"[^"]*"|'[^']*')+/g) ?? [];
      for (const part of parts) {
        const m = part.match(/^\s*([a-zA-Z0-9-]+)\s*=\s*"?([^"]*)"?\s*$/);
        if (m) params[m[1]] = m[2];
      }
    }
  }
  return { name, inline, params };
}

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

    // Fenced directives
    const fenceHeader = isFenceStart(line);
    if (fenceHeader) {
      i++;
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim() !== ':::') {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing :::
      const { name, inline, params } = parseFenceHeader(fenceHeader);
      const content = buf.join('\n').trim();
      const block = renderFenced(name, inline, params, content);
      if (block) blocks.push(block);
      continue;
    }

    // Single-line directives (legacy)
    if (line.startsWith(':::source')) {
      const m = line.match(/^:::source\[([^\]]*)\](?:\(([^)]*)\))?\s*$/);
      blocks.push({
        kind: 'source',
        label: m?.[1]?.trim() ?? '',
        url: m?.[2]?.trim() || null,
      });
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

    // Default: a paragraph — join continuation lines until a blank line
    // or a block-prefix appears.
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

function renderFenced(
  name: string,
  inline: string | null,
  params: Record<string, string>,
  content: string,
): Block | null {
  switch (name) {
    case 'stat':
      return { kind: 'stat', value: inline ?? '', label: content };
    case 'quote':
      return {
        kind: 'pull-quote',
        author: params.author || null,
        source: params.source || null,
        text: content,
      };
    case 'callout': {
      const k = (params.kind as CalloutKind) || 'info';
      const tone: CalloutKind = ['warn', 'info', 'tip', 'love'].includes(k) ? k : 'info';
      return { kind: 'callout', tone, text: content };
    }
    case 'compare': {
      const left: CompareSide = { title: params.leftTitle, text: '' };
      const right: CompareSide = { title: params.rightTitle, text: '' };
      for (const ln of content.split(/\r?\n/)) {
        const m = ln.match(/^\s*(left|right)\s*\|\s*(.*)$/);
        if (!m) continue;
        if (m[1] === 'left') left.text = (left.text ? left.text + ' ' : '') + m[2];
        else right.text = (right.text ? right.text + ' ' : '') + m[2];
      }
      return { kind: 'compare', left, right };
    }
    case 'list-icon': {
      const items: { icon: string; text: string }[] = [];
      for (const ln of content.split(/\r?\n/)) {
        const m = ln.match(/^\s*([a-zA-Z0-9-]+)\s*\|\s*(.*)$/);
        if (m) items.push({ icon: m[1], text: m[2] });
      }
      return { kind: 'list-icon', items };
    }
    case 'progress': {
      const val = parseInt((inline?.match(/val=(\d+)/) || [])[1] ?? '0', 10);
      const max = parseInt((inline?.match(/of=(\d+)/) || [])[1] ?? '100', 10);
      return { kind: 'progress', value: val, max, label: content };
    }
    case 'ex':
      return { kind: 'ex', text: content };
    default:
      return null;
  }
}

// ─── inline ───────────────────────────────────────────────────────────────

type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'link'; text: string; url: string };

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) {
      tokens.push({ kind: 'text', text: text.slice(cursor, match.index) });
    }
    if (match[1] !== undefined) tokens.push({ kind: 'bold', text: match[1] });
    else if (match[2] !== undefined) tokens.push({ kind: 'italic', text: match[2] });
    else if (match[3] !== undefined && match[4] !== undefined) {
      tokens.push({ kind: 'link', text: match[3], url: match[4] });
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) tokens.push({ kind: 'text', text: text.slice(cursor) });
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

// ─── directive components ─────────────────────────────────────────────────

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>
        <InlineText text={label} baseStyle={styles.statLabel} />
      </Text>
    </View>
  );
}

function PullQuote({
  text,
  author,
  source,
}: {
  text: string;
  author: string | null;
  source: string | null;
}) {
  return (
    <View style={styles.pullQuote}>
      <View style={styles.pullQuoteMark}>
        <Ionicons name="chatbox-ellipses" size={18} color={tokens.brand.violet2} />
      </View>
      <Text style={styles.pullQuoteText}>
        <InlineText text={text} baseStyle={styles.pullQuoteText} />
      </Text>
      {(author || source) && (
        <Text style={styles.pullQuoteAttr}>
          {[author, source].filter(Boolean).join(' · ')}
        </Text>
      )}
    </View>
  );
}

const CALLOUT_META: Record<
  CalloutKind,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; border: string }
> = {
  warn: {
    icon: 'warning',
    color: tokens.semantic.warn,
    bg: 'rgba(255, 159, 67, 0.10)',
    border: 'rgba(255, 159, 67, 0.32)',
  },
  info: {
    icon: 'information-circle',
    color: tokens.dimension.bonds,
    bg: 'rgba(77, 208, 255, 0.10)',
    border: 'rgba(77, 208, 255, 0.32)',
  },
  tip: {
    icon: 'bulb',
    color: tokens.brand.violet2,
    bg: 'rgba(123, 92, 255, 0.10)',
    border: 'rgba(123, 92, 255, 0.32)',
  },
  love: {
    icon: 'heart',
    color: '#FF6B7A',
    bg: 'rgba(255, 107, 122, 0.10)',
    border: 'rgba(255, 107, 122, 0.32)',
  },
};

function Callout({ tone, text }: { tone: CalloutKind; text: string }) {
  const m = CALLOUT_META[tone];
  return (
    <View style={[styles.callout, { backgroundColor: m.bg, borderColor: m.border }]}>
      <View style={[styles.calloutIcon, { backgroundColor: m.color + '22' }]}>
        <Ionicons name={m.icon} size={16} color={m.color} />
      </View>
      <Text style={styles.calloutText}>
        <InlineText text={text} baseStyle={styles.calloutText} />
      </Text>
    </View>
  );
}

function Compare({ left, right }: { left: CompareSide; right: CompareSide }) {
  return (
    <View style={styles.compare}>
      <View style={[styles.compareSide, styles.compareLeft]}>
        {left.title && <Text style={styles.compareTitle}>{left.title}</Text>}
        <Text style={styles.compareText}>
          <InlineText text={left.text} baseStyle={styles.compareText} />
        </Text>
      </View>
      <View style={[styles.compareSide, styles.compareRight]}>
        {right.title && <Text style={[styles.compareTitle, styles.compareTitleRight]}>{right.title}</Text>}
        <Text style={styles.compareText}>
          <InlineText text={right.text} baseStyle={styles.compareText} />
        </Text>
      </View>
    </View>
  );
}

function ListIcon({ items }: { items: { icon: string; text: string }[] }) {
  return (
    <View style={styles.iconList}>
      {items.map((it, idx) => (
        <View key={idx} style={styles.iconListItem}>
          <View style={styles.iconListBubble}>
            <Ionicons
              name={it.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={tokens.brand.violet2}
            />
          </View>
          <Text style={styles.iconListText}>
            <InlineText text={it.text} baseStyle={styles.iconListText} />
          </Text>
        </View>
      ))}
    </View>
  );
}

function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <View style={styles.progress}>
      <View style={styles.progressRow}>
        <Text style={styles.progressValue}>{value}%</Text>
        <Text style={styles.progressLabel}>
          <InlineText text={label} baseStyle={styles.progressLabel} />
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

function ExBlock({ text }: { text: string }) {
  return (
    <View style={styles.ex}>
      <Text style={styles.exTag}>EX.</Text>
      <Text style={styles.exText}>
        <InlineText text={text} baseStyle={styles.exText} />
      </Text>
    </View>
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
              <View key={idx} style={styles.blockquote}>
                <Text style={styles.blockquoteText}>
                  <InlineText text={block.text} baseStyle={styles.blockquoteText} />
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
          case 'stat':
            return <StatBlock key={idx} value={block.value} label={block.label} />;
          case 'pull-quote':
            return (
              <PullQuote
                key={idx}
                text={block.text}
                author={block.author}
                source={block.source}
              />
            );
          case 'callout':
            return <Callout key={idx} tone={block.tone} text={block.text} />;
          case 'compare':
            return <Compare key={idx} left={block.left} right={block.right} />;
          case 'list-icon':
            return <ListIcon key={idx} items={block.items} />;
          case 'progress':
            return (
              <Progress
                key={idx}
                value={block.value}
                max={block.max}
                label={block.label}
              />
            );
          case 'ex':
            return <ExBlock key={idx} text={block.text} />;
          default:
            return null;
        }
      })}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    gap: 14,
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
  bold: { fontFamily: 'Manrope_700Bold' },
  italic: { fontStyle: 'italic' },
  link: { color: tokens.brand.violet2, textDecorationLine: 'underline' },

  list: { gap: 6, paddingLeft: 4 },
  listItem: { flexDirection: 'row', gap: 8 },
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

  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: tokens.brand.violet2,
    paddingLeft: 14,
    marginVertical: 4,
  },
  blockquoteText: {
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

  // Stat block — big number callout
  stat: {
    backgroundColor: 'rgba(123, 92, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(123, 92, 255, 0.25)',
    borderRadius: tokens.radius.lg,
    padding: tokens.space[4],
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 44,
    lineHeight: 48,
    color: tokens.text.hi,
    letterSpacing: -1,
  },
  statLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: tokens.text.mid,
    textAlign: 'center',
  },

  // Pull quote
  pullQuote: {
    backgroundColor: tokens.bg.glass,
    borderRadius: tokens.radius.lg,
    padding: tokens.space[4],
    borderLeftWidth: 3,
    borderLeftColor: tokens.brand.violet2,
    gap: 8,
  },
  pullQuoteMark: { opacity: 0.7 },
  pullQuoteText: {
    fontFamily: 'Manrope_600SemiBold',
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 24,
    color: tokens.text.hi,
  },
  pullQuoteAttr: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: tokens.brand.violet2,
  },

  // Callout box — vertical layout (icon top, text below) so multi-line
  // text doesn't wrap awkwardly around a fixed-position icon.
  callout: {
    gap: 10,
    padding: tokens.space[4],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  calloutIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14.5,
    lineHeight: 22,
    color: tokens.text.base,
  },

  // Compare (left vs right)
  compare: {
    flexDirection: 'row',
    gap: 8,
  },
  compareSide: {
    flex: 1,
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: 6,
  },
  compareLeft: {
    backgroundColor: 'rgba(255, 92, 122, 0.06)',
    borderColor: 'rgba(255, 92, 122, 0.24)',
  },
  compareRight: {
    backgroundColor: 'rgba(61, 214, 140, 0.06)',
    borderColor: 'rgba(61, 214, 140, 0.24)',
  },
  compareTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: tokens.semantic.danger,
  },
  compareTitleRight: {
    color: tokens.semantic.xp,
  },
  compareText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: tokens.text.base,
  },

  // List with icons
  iconList: {
    gap: 10,
    paddingVertical: 4,
  },
  iconListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconListBubble: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(123, 92, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconListText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: tokens.text.base,
    paddingTop: 4,
  },

  // Progress bar
  progress: {
    gap: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  progressValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: tokens.text.hi,
  },
  progressLabel: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: tokens.text.mid,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: tokens.bg.surface2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: tokens.brand.violet2,
  },

  // Example box
  ex: {
    backgroundColor: tokens.bg.glassStrong,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    borderWidth: 1,
    borderColor: tokens.border.base,
    flexDirection: 'row',
    gap: 10,
  },
  exTag: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: tokens.brand.violet2,
    marginTop: 3,
  },
  exText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 19,
    color: tokens.text.base,
  },
});
