export interface InputState {
  target: string
  typed: string
  ignoreCase: boolean
  error: boolean
  complete: boolean
}

const isLetter = (ch: string) => /[a-zA-Z]/.test(ch)

/** 把目标里接下来的非字母字符（空格/连字符/撇号等）自动补进已输入串。 */
function autoFill(target: string, typed: string): string {
  let t = typed
  while (t.length < target.length && !isLetter(target[t.length])) {
    t += target[t.length]
  }
  return t
}

export function initInput(target: string, ignoreCase = true): InputState {
  const typed = autoFill(target, '')
  return { target, typed, ignoreCase, error: false, complete: typed.length === target.length }
}

function matches(a: string, b: string, ignoreCase: boolean): boolean {
  return ignoreCase ? a.toLowerCase() === b.toLowerCase() : a === b
}

export function inputChar(state: InputState, char: string): InputState {
  if (state.complete) return state
  const expected = state.target[state.typed.length]
  if (matches(char, expected, state.ignoreCase)) {
    const typed = autoFill(state.target, state.typed + expected)  // 用目标的大小写
    return { ...state, typed, error: false, complete: typed.length === state.target.length }
  }
  return { ...state, error: true }
}
