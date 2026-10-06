export type Comment = { quote: string; text: string }
export type Armed = { id: string; label: string }

declare module 'claude-code' {
  interface PluginState {
    'quick-reply': {
      /** Comments by `<message requestId>:<block index>`, in the order made. */
      comments: Record<string, Comment>
      /** The block the next typed prompt comments on, or null. */
      editing: Armed | null
    }
  }
}
