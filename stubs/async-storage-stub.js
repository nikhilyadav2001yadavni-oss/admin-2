/**
 * MetaMask SDK references @react-native-async-storage/async-storage for RN builds.
 * In Next.js (browser) that package is not installed — this in-memory stub satisfies the import.
 */
const memory = new Map()
const storage = {
  getItem: async (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: async (key, value) => {
    memory.set(key, value)
  },
  removeItem: async (key) => {
    memory.delete(key)
  },
  clear: async () => {
    memory.clear()
  },
  getAllKeys: async () => [...memory.keys()],
  multiGet: async (keys) => keys.map((k) => [k, memory.get(k) ?? null]),
  multiSet: async (pairs) => {
    pairs.forEach(([k, v]) => memory.set(k, v))
  },
  multiRemove: async (keys) => {
    keys.forEach((k) => memory.delete(k))
  },
}

module.exports = storage
module.exports.default = storage
