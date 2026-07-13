// Lightweight cross-component "data changed" signal. The AI assistant lives in a
// globally-mounted FloatingChatbot, completely decoupled from whatever page component
// happens to be showing subscriptions/budget data — so when it confirms a change, it
// can't just update that page's local state directly. Instead it emits one of these
// events, and any page currently listening refetches. If no page is mounted to hear it,
// that's fine — the next time one mounts, it fetches fresh data anyway.
export const SUBSCRIPTIONS_CHANGED = 'bt:subscriptions-changed';
export const BUDGET_CHANGED = 'bt:budget-changed';

export const emitDataChanged = (eventName) => window.dispatchEvent(new Event(eventName));
