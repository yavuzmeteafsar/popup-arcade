const KEY = 'highScores';

export async function loadHighs() {
  const data = await chrome.storage.local.get(KEY);
  return data[KEY] ?? {};
}

export function saveHighs(highs) {
  return chrome.storage.local.set({ [KEY]: highs });
}
