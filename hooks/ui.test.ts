import { expect, mock, test } from 'claude-code/testing'

import { blockId } from './blocks'

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: arm a block, the next prompt becomes its comment`, async ($, on) => {
    on('prompt.submit', ($, e) => ({ text: e.text }))
    let box = ''
    on('prompt.fill', ($, e) => {
      box = e.text
      return { isFilled: true }
    })
    const clock = mock.clock(on)
    mock.env(on, { TMUX_PANE: '%7' })
    const tmux: string[] = []
    on('process.run', ($, e) => {
      tmux.push(e.argv.join(' '))
      return {
        value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
      }
    })
    const msg = await $.ui.mount({
      plugin: 'quick-reply',
      surface,
      component: 'AssistantMessage',
      requestId: 'm1',
      props: { text: 'First para.\n\nSecond para.', isFirstOfReply: true },
    })
    expect(await msg.findAll({ type: 'Button' })).toHaveLength(2)

    await msg.press({ key: `c:${blockId('Second para.')}` })
    const r = await $.prompt.submit({ text: 'my note', origin: { kind: 'composer' }, wait: false })
    expect(r.drop).toContain('comment saved')
    expect(tmux).toEqual([
      'tmux set-option -p -t %7 @qr_armed 1',
      'tmux set-option -p -u -t %7 @qr_armed',
    ])
    await clock.advance(100)
    expect(box).toBe('> Second para.\nmy note\n\n')
    expect((await msg.find({ type: 'Text', text: /my note/ }))?.text).toBe('└ my note')

    // The engine may draw the same reply again under another requestId.
    const again = await $.ui.mount({
      plugin: 'quick-reply',
      surface,
      component: 'AssistantMessage',
      requestId: 'm1-redrawn',
      props: { text: 'First para.\n\nSecond para.', isFirstOfReply: true },
    })
    expect((await again.find({ type: 'Text', text: /my note/ }))?.text).toBe('└ my note')

    const band = await $.ui.mount({
      plugin: 'quick-reply',
      surface,
      component: 'AbovePrompt',
      props: {
        hasSurvey: false,
        isWorking: false,
        maxRows: 10,
        bodyColumns: 80,
        scroll: { offset: 0, bodyRows: 10 },
        view: {},
      },
    })
    expect((await band.find({ type: 'Text', text: /comment/ }))?.text).toBe(
      '1 comment · in the prompt, Enter sends',
    )

    // The box holds the comments (Enter alone sends them) or text without them.
    const sent = await $.prompt.submit({
      text: '> Second para.\nmy note\n\nand also this',
      origin: { kind: 'composer' },
      wait: false,
    })
    expect(sent.text).toBe('> Second para.\nmy note\n\nand also this')

    const later = await $.prompt.submit({ text: 'normal prompt', origin: { kind: 'composer' }, wait: false })
    expect(later.text).toBe('normal prompt')
  })
}
