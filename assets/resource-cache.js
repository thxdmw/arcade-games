const DEFAULT_CACHE_LIMIT = 1024 * 1024 * 1024;

export function configureEmulatorResourceCache(target = globalThis) {
  // EmulatorJS 的调试模式会无条件重新下载 ROM；生产和本地调试都必须关闭这条旁路。
  target.EJS_DEBUG_XX = false;
  target.EJS_CacheLimit = DEFAULT_CACHE_LIMIT;
}

export async function requestPersistentBrowserStorage(storage = globalThis.navigator?.storage) {
  if (!storage?.persist) return false;
  try {
    if (typeof storage.persisted === "function" && await storage.persisted()) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}
