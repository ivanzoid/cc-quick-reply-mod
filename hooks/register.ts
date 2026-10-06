import type { Register, Timer } from 'claude-code'

import { appendQuote, atEmptyLine, quoteBlock, quoteDecorations } from './quote'

const COMMAND = 'qr'
// Auto mode reads the selection this often; a selection unchanged over
// STABLE_POLLS reads counts as finished (the mouse is up), since the engine
// tells plugins neither of the drag's end nor of its own copy-on-select.
const POLL_MS = 150
const STABLE_POLLS = 3

export const register: Register = on => {
  // The selection last turned into a quote: typing `>` again with the same
  // selection still held inserts a plain `>`, and auto mode skips it.
  let lastQuoted: string | undefined

  let auto: Timer | undefined
  let seen: string | undefined
  let seenPolls = 0
  // The block auto mode last appended, so a drag that paused and went on
  // replaces it instead of adding a second one.
  let lastBlock: string | undefined

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Toggle quick-reply auto mode: each finished selection is quoted into the prompt',
    })

    return next(e)
  })

  on('command.run', { command: COMMAND }, async $ => {
    if (auto) {
      auto.cancel()
      auto = undefined
      $.ui.status(undefined)

      return { text: 'quick-reply auto mode off' }
    }

    seen = undefined
    seenPolls = 0
    lastBlock = undefined
    auto = $.clock.every(POLL_MS, () => {
      void (async () => {
        const selected = (await $.ui.selection())?.text
        if (selected === undefined || selected.trim() === '') {
          seen = undefined
          lastQuoted = undefined
          return
        }
        if (selected !== seen) {
          seen = selected
          seenPolls = 1
          return
        }
        seenPolls += 1
        if (seenPolls !== STABLE_POLLS || selected === lastQuoted) return

        const { text: draft } = await $.prompt.read()
        // A selection made inside the prompt box itself is not a quote.
        if (draft.includes(selected.trim())) return

        const replacing = lastQuoted !== undefined && selected.includes(lastQuoted.trim())
          ? lastBlock
          : undefined
        const { text, block } = appendQuote(draft, selected, replacing)
        lastBlock = block
        lastQuoted = selected
        await $.prompt.fill({ text, decorations: quoteDecorations(text) })
      })()
    })
    $.ui.status('❝ auto-quote')

    return { text: 'quick-reply auto mode on: finished selections are quoted into the prompt; /qr to stop' }
  })

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
    lastBlock = undefined

    return next(e)
  })
}
