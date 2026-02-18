/**
 * Creates a reactive store holding a single value.
 *
 * @template T
 * @param {T} initial
 * @returns {{ get(): T, set(next: T): void, subscribe(fn: (value: T) => void): () => void }}
 */
export function createStore(initial) {
    let value = initial;
    const listeners = new Set();

    return {
        get() {
            return value;
        },
        set(next) {
            value = next;
            listeners.forEach((fn) => fn(value));
        },
        subscribe(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        }
    };
}
