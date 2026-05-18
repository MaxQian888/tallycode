import type { CountResult, LanguageRule } from '@shared/report';

interface Marker {
  open: string;
  close: string;
  /** When the block is a string-as-comment span, lines inside count as comments. */
  asComment: boolean;
}

interface CompiledRule {
  lineComments: string[];
  blockMarkers: Marker[];
  hasLineComments: boolean;
  hasBlockMarkers: boolean;
  nested: boolean;
  count: boolean;
}

function compile(rule: LanguageRule): CompiledRule {
  const blockComments: Marker[] = (rule.blockComments ?? []).map(([open, close]) => ({
    open,
    close,
    asComment: true,
  }));
  const blockStrings: Marker[] = (rule.blockStrings ?? []).map(([open, close]) => ({
    open,
    close,
    asComment: rule.blockStringAsComment === true,
  }));
  const blockMarkers = [...blockComments, ...blockStrings];
  return {
    lineComments: (rule.lineComments ?? []).filter(Boolean),
    blockMarkers,
    hasLineComments: (rule.lineComments?.length ?? 0) > 0,
    hasBlockMarkers: blockMarkers.length > 0,
    nested: rule.nestedBlockComment === true,
    count: rule.count !== false,
  };
}

const EMPTY: CountResult = Object.freeze({ code: 0, comment: 0, blank: 0, total: 0 });

/**
 * Pure line counter. Walks the source character-by-character via a small state
 * machine that knows about line comments, block comments, block strings, and
 * nested block-comment delimiters.
 *
 * Classification per source line:
 *   - blank   : empty after trim AND no code/comment characters seen this line
 *   - code    : at least one non-comment, non-string character that's not pure whitespace
 *   - comment : only comment characters (line + block) on this line
 *
 * A line with BOTH code and comment is counted as code (matches vscode-counter
 * semantics, since users mostly want to know "is there source on this line").
 */
export function countLines(source: string, rule: LanguageRule): CountResult {
  const compiled = compile(rule);
  if (!compiled.count)
    return { ...EMPTY };
  if (source.length === 0)
    return { ...EMPTY };

  let code = 0;
  let comment = 0;
  let blank = 0;
  let total = 0;

  // Per-line accumulators
  let sawCode = false;
  let sawComment = false;
  let sawNonWhitespace = false;

  // Block state: a stack of open Markers. When non-empty we're inside a block.
  // Most languages have at most one element; nested rules can grow the stack.
  const stack: Marker[] = [];

  const len = source.length;
  let i = 0;

  // Pre-extract sorted line-comment markers (longest first to avoid prefix shadowing).
  const lineMarkers = [...compiled.lineComments].sort((a, b) => b.length - a.length);

  // We process line by line for fast trim/comment checks, but characters within
  // a line drive the block state machine.
  while (i < len) {
    // Find this line's [start, end), end = newline index OR EOF.
    const lineStart = i;
    let lineEnd = source.indexOf('\n', i);
    if (lineEnd === -1)
      lineEnd = len;
    const hasCR = lineEnd > lineStart && source.charCodeAt(lineEnd - 1) === 13;
    const contentEnd = hasCR ? lineEnd - 1 : lineEnd;

    sawCode = false;
    sawComment = false;
    sawNonWhitespace = false;

    let j = lineStart;
    // Track whether this line *started* inside a block — if so even leading
    // whitespace is comment-territory (or code-territory) per current frame.
    const startedInBlock = stack.length > 0;
    const startedInCommentBlock = startedInBlock && stack[stack.length - 1]!.asComment;
    if (startedInBlock) {
      // Until the closer is found, we're inside the block.
      if (startedInCommentBlock)
        sawComment = true;
      else sawCode = true;
    }

    while (j < contentEnd) {
      const ch = source.charCodeAt(j);

      // Track non-whitespace seen so we can detect "blank" lines.
      if (ch !== 32 && ch !== 9)
        sawNonWhitespace = true;

      // Inside a block? Only the close delimiter matters (plus nested opener).
      if (stack.length > 0) {
        const top = stack[stack.length - 1]!;
        if (compiled.nested && startsWith(source, j, top.open) && top.open !== top.close) {
          stack.push(top);
          j += top.open.length;
          continue;
        }
        if (startsWith(source, j, top.close)) {
          stack.pop();
          j += top.close.length;
          continue;
        }
        j += 1;
        continue;
      }

      // Not inside a block: try matching either a line-comment marker or a
      // block opener. Longest-prefix wins so `--[[` beats `--` in Lua.
      let lineCommentLen = 0;
      if (compiled.hasLineComments) {
        for (const m of lineMarkers) {
          if (startsWith(source, j, m)) {
            lineCommentLen = m.length;
            break;
          }
        }
      }
      let blockMatch: Marker | undefined;
      let blockMatchLen = 0;
      if (compiled.hasBlockMarkers) {
        for (const m of compiled.blockMarkers) {
          if (m.open.length > blockMatchLen && startsWith(source, j, m.open)) {
            blockMatch = m;
            blockMatchLen = m.open.length;
          }
        }
      }
      // Prefer the longer match. Ties go to block (more specific).
      if (blockMatch && blockMatchLen >= lineCommentLen) {
        stack.push(blockMatch);
        if (blockMatch.asComment)
          sawComment = true;
        else sawCode = true;
        j += blockMatchLen;
        continue;
      }
      if (lineCommentLen > 0) {
        // Rest of the line is comment.
        if (!sawCode)
          sawComment = true;
        j = contentEnd;
        break;
      }

      // Otherwise: this character is part of code (unless whitespace).
      if (ch !== 32 && ch !== 9)
        sawCode = true;
      j += 1;
    }

    // Classify line.
    total += 1;
    if (!sawNonWhitespace && !startedInBlock)
      blank += 1;
    else if (sawCode)
      code += 1;
    else if (sawComment)
      comment += 1;
    else blank += 1;

    i = lineEnd + 1;
  }

  return { code, comment, blank, total };
}

function startsWith(s: string, at: number, needle: string): boolean {
  if (needle.length === 0)
    return false;
  if (at + needle.length > s.length)
    return false;
  for (let k = 0; k < needle.length; k++) {
    if (s.charCodeAt(at + k) !== needle.charCodeAt(k))
      return false;
  }
  return true;
}
