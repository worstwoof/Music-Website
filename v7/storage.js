function readSetting(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function saveSetting(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function readSongIds(key) {
  const ids = readSetting(key, []);
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter(id => Number.isSafeInteger(id) && id >= 0))];
}
