import type { On } from 'claude-code'

import { atEmptyLine, quoteBlock, quoteDecorations } from './quote'

// The selection last turned into a quote: typing `>` again with the same
// selection still held inserts a plain `>`.
let lastQuoted: string | undefined

/** Forgets the last quoted selection: the plugin's one prompt.submit hook calls it. */
export function resetLastQuoted() {
  lastQuoted = undefined
}

/** Typing `>` on an empty prompt line quotes the mouse selection there. */
export function registerQuoteTrigger(on: On) {
  on('prompt.edit', async ($, e, next) => {
    const isTrigger =
      e.inputText === '>' && e.start === e.end && atEmptyLine(e.text, e.start)

    if (isTrigger) {
      const selected = await $.ui.selection()
      const block = selected && quoteBlock(selected.text, e.text.slice(0, e.start))
      if (block && selected.text !== lastQuoted) {
        lastQuoted = selected.text
        const r = await next({ ...e, inputText: block })

        return { ...r, decorations: quoteDecorations(r.text) }
      }
    }

    const r = await next(e)

    return { ...r, decorations: [...(r.decorations ?? []), ...quoteDecorations(r.text)] }
  })

}
