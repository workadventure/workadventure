/**
 * Where services say "I hold something in memory that must reach its destination
 * before this process exits".
 *
 * server.ts used to name each drainable service, import it and hand-write its
 * drain-then-stop pair, so adding one meant editing a file that has nothing to do
 * with it — and forgetting to meant losing its buffer on every deploy, silently.
 * A service now registers itself where it is built.
 *
 * Registration only records the callback: nothing runs until `runDrains` is
 * called. That ordering is the point. The previous version built an array of
 * already-started promises, so the drains began the moment the array literal was
 * evaluated — harmless there because the array was built inside the signal
 * handler, but a trap for anyone who moved it.
 */
type DrainableService = {
    name: string;
    /** Flush what is buffered, within the budget. Must not reject on timeout. */
    drain: (timeoutMs: number) => Promise<void>;
    /** Release the timers and stop accepting work. Runs whether the drain worked or not. */
    stop: () => void;
};

const services: DrainableService[] = [];

export function registerDrainableService(service: DrainableService): void {
    services.push(service);
}

/**
 * Drains everything registered, in parallel, and reports each failure by name.
 *
 * Parallel rather than sequential because the budget is wall-clock: services do
 * not contend, and running them in series would make the shutdown budget their
 * sum rather than their maximum.
 *
 * Never rejects. A service that throws is logged and does not stop the others —
 * a failed flush is a lost buffer, not a reason to skip the remaining flushes.
 */
export async function runDrains(timeoutMs: number): Promise<void> {
    const results = await Promise.allSettled(
        services.map((service) => service.drain(timeoutMs).finally(() => service.stop())),
    );

    results.forEach((result, index) => {
        if (result.status === "rejected") {
            console.error(`Error while draining ${services[index].name} during shutdown`, result.reason);
        }
    });
}

/** Test seam: the registry is process-global, so suites have to be able to reset it. */
export function clearDrainableServices(): void {
    services.length = 0;
}
