import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import type { Armed, Comment } from '../types'
import { blockId, composeReply, splitBlocks } from './blocks'
import { quoteDecorations } from './quote'
import { isQuoteTrigger, resetLastQuoted, withQuote } from './quote-trigger'

const comments = atom({ plugin: 'quick-reply', key: 'comments' } as const, {})
// The block armed for a comment: the next prompt typed is saved as its comment
// instead of being sent. (A field inside a transcript row never gets the keys.)
const editing = atom({ plugin: 'quick-reply', key: 'editing' } as const, null)
// The prompt's text while a block is armed, drawn live under that block.
const draft = atom({ plugin: 'quick-reply', key: 'draft' } as const, '')

/** Mirrors the prompt under the armed block as it is typed; no-op otherwise. */
async function mirrorDraft($: EngineInterface, text: string) {
  if ((await read($, editing)) === null) return
  await update($, draft, () => text)
}

// Saves `text` as the armed block's comment (empty removes it) and disarms.
async function saveArmed($: EngineInterface, armed: Armed, quote: string | undefined, text: string) {
  await update($, comments, cur => {
    const { [armed.id]: _, ...rest } = cur
    const q = quote ?? cur[armed.id]?.quote

    return text === '' || q === undefined ? rest : { ...rest, [armed.id]: { quote: q, text } }
  })
  await disarm($)
}

const disarm = async ($: EngineInterface) => {
  await update($, editing, () => null)
  await update($, draft, () => '')
}

const firstLine = (text: string, max = 50) => {
  const line = (text.split('\n')[0] ?? '').replace(/^[-*+#>\s]+|^\d+[.)]\s+/, '')

  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}

// Puts the pending comments in the prompt box, ready to send with Enter, the
// caret below them for text of one's own. Run after the box was cleared.
async function showPending($: EngineInterface) {
  const text = pendingText(Object.values(await read($, comments)))
  if (text === '') return
  await $.prompt.fill({ text, decorations: quoteDecorations(text) })
}

// The pending comments as the prompt box holds them, the caret's line below.
const pendingText = (list: Comment[]) => (list.length === 0 ? '' : `${composeReply(list)}\n\n`)

/**
 * Inline comments: a marker beside each block of a reply arms it, the next
 * prompt typed is saved as its comment, and the comments wait in the prompt.
 * Also the `>` selection quote, which shares the prompt hooks.
 */
export function registerInlineComments(on: On) {
  // Quotes by block id, for blocks drawn this session: the armed id's quote
  // is read from here when the comment is saved.
  const quotes = new Map<string, string>()

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.isSummary) return next(e)
    const blocks = splitBlocks(e.props.text)
    if (blocks.length === 0) return next(e)

    const { Box, Button, Markdown, Text } = $.ui.resolve(e)
    const all = await read($, comments)
    const armed = await read($, editing)
    const typed = await read($, draft)

    return (
      <Box flexDirection="column">
        {blocks.map((block, i) => {
          const id = blockId(block)
          quotes.set(id, block)
          const comment = all[id]
          const isArmed = armed?.id === id
          const isBullet = i === 0 && e.props.isFirstOfReply
          const marker = isArmed ? '▶' : comment ? '✎' : null
          const markerButton = (label: string) => (
            <Button
              key={`c:${id}`}
              label={label}
              plain
              dimColor={label === '+'}
              onPress={async () => {
                if (isArmed) {
                  await disarm($)
                  await $.prompt.fill({ text: '' })
                  await showPending($)
                  return
                }
                await update($, editing, () => ({ id, label: firstLine(block) }))
                await update($, draft, () => comment?.text ?? '')
                await $.prompt.fill({ text: comment?.text ?? '' })
              }}
            />
          )

          return (
            <Box key={`b:${id}`} flexDirection="column" marginBottom={i < blocks.length - 1 ? 1 : 0}>
              <Box flexDirection="row">
                <Box key={`g:${id}`} width={2} flexShrink={0}>
                  {/* ✎ and ▶ show always. Otherwise a `+` is laid over the gutter
                      (absolute, so it covers a reply's ● bullet) and revealed only
                      while the pointer is over the gutter, its own hover scope. */}
                  {marker === null ? (
                    <>
                      <Text>{isBullet ? '●' : ' '}</Text>
                      <Box position="absolute" top={0} left={0} display="none" hover={{ display: 'flex' }}>
                        {markerButton('+')}
                      </Box>
                    </>
                  ) : (
                    markerButton(marker)
                  )}
                </Box>
                <Box flexGrow={1} flexShrink={1}>
                  <Markdown text={block} />
                </Box>
              </Box>
              {isArmed ? (
                <Box marginLeft={2}>
                  {typed.trim() === '' ? (
                    <Text dimColor italic>└ type your comment in the prompt; Shift+Enter or Ctrl+J saves</Text>
                  ) : (
                    <Text color="warning" italic>{`└ ${typed}▏`}</Text>
                  )}
                </Box>
              ) : (
                comment && (
                  <Box marginLeft={2}>
                    <Text color="warning">{`└ ${comment.text}`}</Text>
                  </Box>
                )
              )}
            </Box>
          )
        })}
      </Box>
    )
  })

  // The plugin's one prompt.edit hook: a `>` on an empty line quotes the
  // mouse selection; while a block is armed the draft is mirrored under it and
  // a newline (Shift+Enter, Ctrl+J) saves it: an edit, unlike
  // Enter's submit, leaves the transcript where it is. Quote lines draw dim.
  on('prompt.edit', async ($, e, next) => {
    const armed = await read($, editing)
    const isNewline =
      e.inputText !== '' && e.inputText.trim() === '' && /[\r\n]/.test(e.inputText)
    if (armed && isNewline) {
      await saveArmed($, armed, quotes.get(armed.id), e.text.trim())
      // A box answered here with the comments in it did not show them until
      // Enter (seen live); consume the key with an empty box, then fill it.
      $.clock.after(50, () => void showPending($))

      return { text: '', cursor: 0 }
    }

    const edit = isQuoteTrigger(e) ? withQuote(e, (await $.ui.selection())?.text) : e
    const r = await next(edit)
    await mirrorDraft($, r.text)

    return { ...r, decorations: [...(r.decorations ?? []), ...quoteDecorations(r.text)] }
  })

  on('prompt.submit', async ($, e, next) => {
    resetLastQuoted()
    if (e.origin?.kind !== 'composer' || e.text.trimStart().startsWith('/')) return next(e)

    const armed = await read($, editing)
    if (!armed) {
      const list: Comment[] = Object.values(await read($, comments))
      if (list.length === 0) return next(e)
      await update($, comments, () => ({}))
      // The box usually holds them already (showPending); else they go first.
      const reply = composeReply(list)
      const own = e.text.trim()
      const text = own.startsWith(reply) ? own : own === '' ? reply : `${reply}\n\n${own}`

      return next({ ...e, text })
    }

    await saveArmed($, armed, quotes.get(armed.id), e.text.trim())
    // The engine empties the box once the drop is answered; refill after it.
    // (Enter also scrolls the transcript to its end, which no hook can undo.)
    $.clock.after(50, () => void showPending($))

    return { drop: `comment saved on «${armed.label}» (not sent)` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const all = await read($, comments)
    const list: Comment[] = Object.values(all)
    const armed = await read($, editing)
    if (e.props.hasSurvey || (list.length === 0 && !armed)) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const clear = async () => {
      await update($, comments, () => ({}))
      await disarm($)
    }

    return (
      <Box flexDirection="column">
        {armed && (
          <Box flexDirection="row" gap={1}>
            <Text color="warning">{`✎ commenting on «${armed.label}» — type it, Shift+Enter or Ctrl+J saves`}</Text>
            {all[armed.id] && (
              <Button
                key="remove"
                label="Remove"
                onPress={async () => {
                  await update($, comments, ({ [armed.id]: _, ...rest }) => rest)
                  await disarm($)
                  await $.prompt.fill({ text: '' })
                  await showPending($)
                }}
              />
            )}
            <Button
              key="cancel"
              label="Cancel"
              onPress={async () => {
                await disarm($)
                await $.prompt.fill({ text: '' })
                await showPending($)
              }}
            />
          </Box>
        )}
        {list.length > 0 && (
          <Box flexDirection="row" gap={1}>
            <Text color="warning">{`${list.length} comment${list.length === 1 ? '' : 's'} · in the prompt, Enter sends`}</Text>
            <Button
              key="clear"
              label="Clear"
              onPress={async () => {
                await clear()
                await $.prompt.fill({ text: '' })
              }}
            />
          </Box>
        )}
      </Box>
    )
  })
}
