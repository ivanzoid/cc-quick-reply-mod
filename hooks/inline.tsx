import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import type { Comment } from '../types'
import { composeReply, splitBlocks } from './blocks'
import { quoteDecorations } from './quote'
import { resetLastQuoted } from './quote-trigger'

const comments = atom({ plugin: 'quick-reply', key: 'comments' } as const, {})
// The block armed for a comment: the next prompt typed is saved as its comment
// instead of being sent. (A field inside a transcript row never gets the keys.)
const editing = atom({ plugin: 'quick-reply', key: 'editing' } as const, null)

const firstLine = (text: string, max = 50) => {
  const line = (text.split('\n')[0] ?? '').replace(/^[-*+#>\s]+|^\d+[.)]\s+/, '')

  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}

// Puts the pending comments in the prompt box, ready to send with Enter, the
// caret below them for text of one's own. Run after the box was cleared.
async function showPending($: EngineInterface) {
  const list: Comment[] = Object.values(await read($, comments))
  if (list.length === 0) return
  const text = `${composeReply(list)}\n\n`
  await $.prompt.fill({ text, decorations: quoteDecorations(text) })
}

/**
 * Inline comments: a marker beside each block of a reply arms it, the next
 * prompt typed is saved as its comment, and the comments wait in the prompt.
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

    return (
      <Box flexDirection="column">
        {blocks.map((block, i) => {
          const id = `${e.requestId}:${i}`
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
                  await update($, editing, () => null)
                  await showPending($)
                  return
                }
                await update($, editing, () => ({ id, label: firstLine(block) }))
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
              {comment && (
                <Box marginLeft={2}>
                  <Text color="warning">{`└ ${comment.text}`}</Text>
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
    )
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

    const text = e.text.trim()
    await update($, comments, cur => {
      const { [armed.id]: _, ...rest } = cur
      const quote = quotes.get(armed.id) ?? cur[armed.id]?.quote

      return text === '' || quote === undefined ? rest : { ...rest, [armed.id]: { quote, text } }
    })
    await update($, editing, () => null)
    // The engine empties the box once the drop is answered; refill after it.
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
      await update($, editing, () => null)
    }

    return (
      <Box flexDirection="column">
        {armed && (
          <Box flexDirection="row" gap={1}>
            <Text color="warning">{`✎ commenting on «${armed.label}» — type below, Enter saves`}</Text>
            {all[armed.id] && (
              <Button
                key="remove"
                label="Remove"
                onPress={async () => {
                  await update($, comments, ({ [armed.id]: _, ...rest }) => rest)
                  await update($, editing, () => null)
                }}
              />
            )}
            <Button
              key="cancel"
              label="Cancel"
              onPress={async () => {
                await update($, editing, () => null)
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
