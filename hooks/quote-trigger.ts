import type { PromptEditInput } from 'claude-code'

import { atEmptyLine, quoteBlock } from './quote'

// The selection last turned into a quote: typing `>` again with the same
// selection still held inserts a plain `>`.
let lastQuoted: string | undefined

/** Forgets the last quoted selection: the plugin's one prompt.submit hook calls it. */
export function resetLastQuoted() {
  lastQuoted = undefined
}

/** Whether the edit is a `>` typed on an empty prompt line. */
export function isQuoteTrigger(e: PromptEditInput): boolean {
  return e.inputText === '>' && e.start === e.end && atEmptyLine(e.text, e.start)
}

/**
 * The trigger edit with the mouse selection put in as a quote block; the edit
 * as it came when nothing is selected or that selection was just quoted.
 */
export function withQuote(e: PromptEditInput, selected: string | undefined): PromptEditInput {
  const block = selected === undefined ? '' : quoteBlock(selected, e.text.slice(0, e.start))
  if (block === '' || selected === lastQuoted) return e
  lastQuoted = selected

  return { ...e, inputText: block }
}
