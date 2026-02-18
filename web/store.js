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

/**
 * Creates a read-only store whose value is derived from one or more source stores.
 * The derivation function receives the current values of all sources as an array.
 * The derived store updates whenever any source store changes.
 *
 * @template T
 * @param {Array<ReturnType<typeof createStore>>} stores
 * @param {(values: any[]) => T} fn
 * @returns {{ get(): T, subscribe(fn: (value: T) => void): () => void }}
 */
export function derive(stores, fn) {
    const derived = createStore(fn(stores.map((s) => s.get())));

    stores.forEach((store) => {
        store.subscribe(() => {
            derived.set(fn(stores.map((s) => s.get())));
        });
    });

    return {
        get: derived.get.bind(derived),
        subscribe: derived.subscribe.bind(derived)
    };
}

/**
 * Runs a side-effect function whenever any of the given stores change.
 * The function receives the current values of all stores as an array.
 * Returns an unsubscribe function that stops all subscriptions.
 *
 * @param {Array<ReturnType<typeof createStore>>} stores
 * @param {(values: any[]) => void} fn
 * @returns {() => void} unsubscribe
 */
export function effect(stores, fn) {
    const run = () => fn(stores.map((s) => s.get()));
    const unsubscribers = stores.map((store) => store.subscribe(run));
    return () => unsubscribers.forEach((unsub) => unsub());
}
