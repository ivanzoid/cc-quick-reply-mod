/** The flag the plugin sets on its tmux pane while a block is armed. */
export const ARMED_OPTION = '@qr_armed'

/** The root-table binding: Enter goes in as Shift+Enter while armed. */
export const ENTER_BINDING = [
  'bind-key', '-T', 'root', 'Enter',
  'if-shell', '-F', `#{${ARMED_OPTION}}`, 'send-keys S-Enter', 'send-keys Enter',
] as const

export type TmuxPlan = 'bind' | 'already-bound' | 'no-extended-keys' | 'enter-taken'

/**
 * Whether to bind Enter, from `tmux show -sv extended-keys` and the root
 * table's Enter binding as `tmux list-keys -T root Enter` prints it (empty
 * when there is none). Without extended keys tmux can't send a Shift+Enter
 * Claude Code tells from Enter; someone else's Enter binding is left alone.
 */
export function tmuxPlan(extendedKeys: string, enterBinding: string): TmuxPlan {
  if (enterBinding.includes(ARMED_OPTION)) return 'already-bound'
  if (enterBinding.trim() !== '') return 'enter-taken'
  if (!['on', 'always'].includes(extendedKeys.trim())) return 'no-extended-keys'

  return 'bind'
}
