import type { Register } from 'claude-code'

import { registerInlineComments } from './inline'
import { registerQuoteTrigger } from './quote-trigger'

export const register: Register = on => {
  registerQuoteTrigger(on)
  registerInlineComments(on)
}
