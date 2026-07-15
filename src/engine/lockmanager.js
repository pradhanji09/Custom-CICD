class LockManager {
  #lockStore;

  constructor() {
    this.#lockStore = new Map();
  }

  acquireLock(key) {
    if (this.#lockStore.has(key)) {
      return false;
    }
    this.#lockStore.set(key, true);
    return true;
  }

  releaseLock(key) {
    if (!this.#lockStore.has(key)) {
      return false;
    }
    this.#lockStore.delete(key);
    return true;
  }
}

const lockManager = new LockManager();

module.exports = lockManager;
