import { asError } from "catch-unknown";
import { abortTimeout } from "@workadventure/shared-utils/src/Abort/AbortTimeout";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import { abortAny } from "@workadventure/shared-utils/src/Abort/AbortAny";
import type { IframeMessagePortData, IframeMessagePortMap } from "../Events/MessagePortEvents";
import type { IframeEvent, IframeQuery, IframeQueryMap, IframeQueryWrapper } from "../Events/IframeEvent";
import { CheckedIframeMessagePort } from "./CheckedIframeMessagePort";

export function sendToWorkadventure(content: IframeEvent, transfer?: Transferable[]) {
    window.parent.postMessage(content, "*", transfer);
}

let queryNumber = 0;
let queryNumberMessagePort = 0;

export const answerPromises = new Map<
    number,
    {
        resolve: (
            value:
                | IframeQueryMap[keyof IframeQueryMap]["answer"]
                | PromiseLike<IframeQueryMap[keyof IframeQueryMap]["answer"]>
        ) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reject: (reason?: any) => void;
    }
>();

export const answerPromisesMessagePort = new Map<
    number,
    {
        resolve: () => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reject: (reason?: any) => void;
    }
>();

export function queryWorkadventure<T extends keyof IframeQueryMap>(
    content: IframeQuery<T>,
    options?: {
        transfer?: Transferable[];
        signal?: AbortSignal;
        // Default to 15 seconds timeout. Set to null to disable timeout.
        timeout?: number | null;
    }
): Promise<IframeQueryMap[T]["answer"]> {
    if (options?.signal?.aborted) {
        return Promise.reject(asError(options?.signal?.reason));
    }
    const signals: AbortSignal[] = [];
    if (options?.signal) {
        signals.push(options.signal);
    }
    if (options?.timeout !== null) {
        signals.push(
            abortTimeout(options?.timeout ?? 15000, new AbortError("The query took too long and was aborted"))
        );
    }
    const finalSignal = abortAny(signals);

    return new Promise<IframeQueryMap[T]["answer"]>((resolve, reject) => {
        window.parent.postMessage(
            {
                id: queryNumber,
                query: content,
            } as IframeQueryWrapper<T>,
            "*",
            options?.transfer
        );

        const onAbort = () => {
            // TODO: we could send a message to WA to tell it to cancel the query

            // Let's do nothing when the query answer actually finishes
            answerPromises.set(queryNumber, {
                resolve: () => {},
                reject: () => {},
            });
            // After 10 seconds, let's remove the query to avoid memory leaks. If the answer arrives after that, we will have a warning in the console, but it's better than a memory leak.
            setTimeout(() => {
                answerPromises.delete(queryNumber);
            }, 10000);
            reject(new AbortError());
        };

        finalSignal.addEventListener("abort", onAbort, { once: true });

        answerPromises.set(queryNumber, {
            resolve: (value) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                resolve(value);
                finalSignal.removeEventListener("abort", onAbort);
            },
            reject: (reason) => {
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                reject(reason);
                finalSignal.removeEventListener("abort", onAbort);
            },
        });

        queryNumber++;
    });
}

export async function openMessagePort<K extends keyof IframeMessagePortMap>(
    type: K,
    data: IframeMessagePortData<K>["data"]
): Promise<CheckedIframeMessagePort<K>> {
    return new Promise<CheckedIframeMessagePort<K>>((resolve, reject) => {
        const port = new MessageChannel();
        window.parent.postMessage(
            {
                messagePort: true,
                id: queryNumberMessagePort,
                type,
                data,
            },
            "*",
            [port.port1]
        );

        answerPromisesMessagePort.set(queryNumberMessagePort, {
            resolve: () => resolve(new CheckedIframeMessagePort<K>(port.port2, type)),
            reject,
        });

        queryNumberMessagePort++;
    });
}

/**
 * !! be aware that the implemented attributes (addMethodsAtRoot and subObjectIdentifier) must be readonly
 *
 *
 */

export abstract class IframeApiContribution<
    T extends {
        callbacks: unknown[];
    }
> {
    abstract callbacks: T["callbacks"];
}
