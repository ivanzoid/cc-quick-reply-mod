import type { Register } from 'claude-code'

import { registerInlineComments } from './inline'

export const register: Register = on => {
  registerInlineComments(on)
}
