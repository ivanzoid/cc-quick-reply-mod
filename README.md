# quick-reply

Claude Code mod: reply to specific parts of an agent answer.

Two ways, both ending up in your prompt as `> quote` / comment pairs:

```
> quote 1
my comment 1

> quote 2
my comment 2
```

## Inline comments

1. Hover the left gutter of any block (paragraph, list item, code block) of an
   answer — a `+` appears (over the `●` bullet on a reply's first block). Click it;
   it turns into `▶` and the band above the prompt says which block is armed.
2. Type your comment in the normal prompt — it is mirrored live under the
   block as you type. Press **Shift+Enter** (or **Ctrl+J**) to save: it is
   drawn under the block (`└ comment`, marker `✎`) and the view stays put.
   Plain Enter saves too; outside tmux (see below) Claude Code then scrolls to
   the bottom.
3. Repeat. All pending comments wait in the prompt box (quotes dimmed); press
   Enter to send them, or add your own text below first.

Click `✎` to edit a comment, `▶` or **Cancel** to disarm, **Remove** to delete
the armed block's comment, **Clear** in the band to drop them all.

Notes: the plugin draws assistant replies itself (to put markers in the
gutter), so their layout may differ slightly from Claude Code's own. Comments
are tied to a block's text, so identical blocks share one; while a block is
armed a comment can't hold a line break (the newline saves).

### tmux: plain Enter without the jump

Inside tmux this works out of the box. While a block is armed the plugin sets
the pane option `@qr_armed`, and at session start it binds Enter in the running
tmux server (your config files are untouched) to send Shift+Enter while that
flag is set — a save without the scroll:

```
bind-key -T root Enter if-shell -F "#{@qr_armed}" "send-keys S-Enter" "send-keys Enter"
```

It skips the binding, saying so once in the transcript, when tmux's
`extended-keys` is off (add `set -g extended-keys on`) or Enter is already bound
by you. Turn it off with the plugin's **tmuxEnter** setting (`/config`). Not
`C-j`: a bare line feed is inserted by Claude Code without reaching the plugin.

## Quote a selection

1. Select text in the transcript with the mouse (needs `"tui": "fullscreen"`).
2. On an empty line in the prompt, type `>` — the selection is inserted as a `> ` quote, caret below it.
3. Write your comment; new line with Shift+Enter or `\` + Enter. Repeat, then Enter to send.

`>` on a non-empty line, with nothing selected, or a second time with the same
selection inserts a plain `>`.

## Install

```
/plugin install quick-reply --marketplace ivanzoid/cc-quick-reply-mod
```

Answer `y` to add the marketplace, then pick the user scope.
