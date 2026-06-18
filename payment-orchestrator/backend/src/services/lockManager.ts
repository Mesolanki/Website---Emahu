/**
 * An enterprise-grade, in-memory distributed mutex simulation.
 * In a real multi-instance production setup (e.g. Kubernetes, multiple nodes),
 * this would be implemented using Redis (e.g., Redlock) or database-level advisory locks.
 */
class LockManager {
  private locks: Map<string, { expiresAt: number }> = new Map();

  /**
   * Attempts to acquire an exclusive lock for a given key.
   * @param key Unique key to lock (e.g., transaction ID, idempotency key)
   * @param ttlMs Time-to-live in milliseconds
   * @returns true if lock acquired successfully, false if already locked
   */
  public async acquireLock(key: string, ttlMs: number = 5000): Promise<boolean> {
    const now = Date.now();
    const existingLock = this.locks.get(key);

    if (existingLock) {
      if (now < existingLock.expiresAt) {
        // Lock is still active and valid
        return false;
      }
      // Lock expired, we can overwrite it
      this.locks.delete(key);
    }

    this.locks.set(key, { expiresAt: now + ttlMs });
    return true;
  }

  /**
   * Releases a lock for a key.
   */
  public releaseLock(key: string): void {
    this.locks.delete(key);
  }
}

export const lockManager = new LockManager();
