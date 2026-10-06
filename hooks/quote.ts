import type { PromptDecoration } from 'claude-code'

/** True when the caret sits at the start of an empty line of the draft. */
export function atEmptyLine(text: string, cursor: number): boolean {
  const before = cursor === 0 || text[cursor - 1] === '\n'
  const after = cursor === text.length || text[cursor] === '\n'
  return before && after
}

/**
 * The selection as a markdown quote block, ending in a newline so the caret
 * lands on the line below, where the reply goes. A blank line is put before
 * it when the line above holds a previous reply, so the blocks stay apart.
 */
export function quoteBlock(selected: string, textBefore: string): string {
  const lines = selected
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
  while (lines.length > 0 && lines[0] === '') lines.shift()
  while (lines.length > 0 && lines.at(-1) === '') lines.pop()
  if (lines.length === 0) return ''

  const quoted = lines.map(line => (line === '' ? '>' : `> ${line}`)).join('\n')
  const needsGap = textBefore.length > 0 && !textBefore.endsWith('\n\n')

  return `${needsGap ? '\n' : ''}${quoted}\n`
}

/** Dims every quote line of the draft, so the replies stand out. */
export function quoteDecorations(text: string): PromptDecoration[] {
  const runs: PromptDecoration[] = []
  let start = 0
  for (const line of text.split('\n')) {
    if (line.startsWith('>')) {
      runs.push({ start, end: start + line.length, dimColor: true, italic: true })
    }
    start += line.length + 1
  }

  return runs
}

/**
 * The draft with the selection's quote block added at its end, on a line of
 * its own. When the draft still ends with `replacing` (the block auto mode put
 * there a moment ago, from a drag that paused and went on), that block is
 * swapped for the new one instead of a second block being added.
 */
export function appendQuote(
  draft: string,
  selected: string,
  replacing?: string,
): { text: string; block: string } {
  const base =
    replacing !== undefined && replacing !== '' && draft.endsWith(replacing)
      ? draft.slice(0, draft.length - replacing.length)
      : draft
  const head = base === '' || base.endsWith('\n') ? base : `${base}\n`
  const text = head + quoteBlock(selected, head)

  return { text, block: text.slice(base.length) }
}
