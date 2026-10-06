import type { Register } from 'claude-code'

import { atEmptyLine, quoteBlock, quoteDecorations } from './quote'

export const register: Register = on => {
  // The selection last turned into a quote: typing `>` again with the same
  // selection still held inserts a plain `>`.
  let lastQuoted: string | undefined

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

  on('prompt.submit', async ($, e, next) => {
    lastQuoted = undefined

    return next(e)
  })
}
