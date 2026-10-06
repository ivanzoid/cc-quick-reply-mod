import { expect, test } from 'claude-code/testing'

import { tmuxPlan } from './tmux'

test('binds Enter only with extended keys and no other Enter binding', () => {
  expect(tmuxPlan('on\n', '')).toBe('bind')
  expect(tmuxPlan('always', '')).toBe('bind')
  expect(tmuxPlan('off', '')).toBe('no-extended-keys')
  expect(tmuxPlan('on', 'bind-key -T root Enter if-shell -F "#{@qr_armed}" ...')).toBe('already-bound')
  expect(tmuxPlan('on', 'bind-key -T root Enter send-keys Escape')).toBe('enter-taken')
})
