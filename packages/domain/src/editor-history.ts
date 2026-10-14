export type History<T> = { past: T[]; present: T; future: T[] };
export type HistoryAction<T> =
  { type: "edit" | "reset"; value: T } | { type: "undo" | "redo" };
export function historyReducer<T>(
  state: History<T>,
  action: HistoryAction<T>,
): History<T> {
  if (action.type === "reset")
    return { past: [], present: action.value, future: [] };
  if (action.type === "edit") {
    if (JSON.stringify(action.value) === JSON.stringify(state.present))
      return state;
    return {
      past: [...state.past, state.present].slice(-50),
      present: action.value,
      future: [],
    };
  }
  if (action.type === "undo" && state.past.length)
    return {
      past: state.past.slice(0, -1),
      present: state.past.at(-1)!,
      future: [state.present, ...state.future],
    };
  if (action.type === "redo" && state.future.length)
    return {
      past: [...state.past, state.present],
      present: state.future[0],
      future: state.future.slice(1),
    };
  return state;
}
