import { expect, test } from 'claude-code/testing'

import { appendQuote, atEmptyLine, quoteBlock, quoteDecorations } from './quote'

test('triggers only on an empty line', () => {
  expect(atEmptyLine('', 0)).toBe(true)
  expect(atEmptyLine('> a\nreply\n', 10)).toBe(true)
  expect(atEmptyLine('reply', 5)).toBe(false)
  expect(atEmptyLine('ab', 1)).toBe(false)
})

test('quotes every line, trims padding, keeps blank lines as >', () => {
  expect(quoteBlock('\n  first   \n\nsecond  \n\n', '')).toBe('>   first\n>\n> second\n')
})

test('separates from a previous reply with a blank line', () => {
  expect(quoteBlock('two', '> one\nmy comment\n')).toBe('\n> two\n')
  expect(quoteBlock('two', '> one\nmy comment\n\n')).toBe('> two\n')
})

test('empty selection yields nothing', () => {
  expect(quoteBlock('  \n ', '')).toBe('')
})

test('decorates quote lines only', () => {
  expect(quoteDecorations('> a\nreply\n> bc')).toEqual([
    { start: 0, end: 3, dimColor: true, italic: true },
    { start: 10, end: 14, dimColor: true, italic: true },
  ])
})

test('appendQuote puts the block on its own line, apart from a reply', () => {
  expect(appendQuote('', 'a')).toEqual({ text: '> a\n', block: '> a\n' })
  expect(appendQuote('> a\nmy comment', 'b')).toEqual({
    text: '> a\nmy comment\n\n> b\n',
    block: '\n\n> b\n',
  })
})

test('appendQuote swaps the block a paused drag left behind', () => {
  const first = appendQuote('> a\nok\n', 'hel')
  expect(first.block).toBe('\n> hel\n')
  expect(appendQuote(first.text, 'hello', first.block).text).toBe('> a\nok\n\n> hello\n')
  expect(appendQuote(`${first.text}typed`, 'hello', first.block).text).toBe(
    `${first.text}typed\n\n> hello\n`,
  )
})
