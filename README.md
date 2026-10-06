# quick-reply

Claude Code mod: reply to specific parts of an agent answer.

1. Select text in the transcript with the mouse (needs `"tui": "fullscreen"`).
2. On an empty line in the prompt, type `>` — the selection is inserted as a `> ` quote, caret below it.
3. Write your comment; new line with Shift+Enter or `\` + Enter.
4. Repeat for more passages, then Enter to send:

```
> quote 1
my comment 1

> quote 2
my comment 2
```

`>` on a non-empty line, with nothing selected, or a second time with the same selection inserts a plain `>`.

## Install

```
/plugin install quick-reply --marketplace ivanzoid/cc-quick-reply-mod
```

Answer `y` to add the marketplace, then pick the user scope.
