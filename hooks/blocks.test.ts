import { expect, test } from 'claude-code/testing'

import { composeReply, splitBlocks } from './blocks'

test('splits paragraphs, list items and headings, keeps fences whole', () => {
  const md = '## Title\nIntro line\nmore intro\n\n- one\n- two\n  cont\n\n```sh\na\n\nb\n```\nafter'
  expect(splitBlocks(md)).toEqual([
    '## Title\nIntro line\nmore intro',
    '- one',
    '- two\n  cont',
    '```sh\na\n\nb\n```',
    'after',
  ])
})

test('composes quote/comment pairs', () => {
  expect(composeReply([
    { quote: 'a\n\nb', text: 'c1' },
    { quote: 'x', text: 'c2' },
  ])).toBe('> a\n>\n> b\nc1\n\n> x\nc2')
})
