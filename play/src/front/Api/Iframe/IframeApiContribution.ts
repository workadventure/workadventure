import type { IframeEvent, IframeQuery, IframeQueryMap, IframeQueryWrapper } from "../Events/IframeEvent";

export function sendToWorkadventure(content: IframeEvent, transfer?: Transferable[]) {
    window.parent.postMessage(content, "*", transfer);
}

let queryNumber = 0;

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

export function queryWorkadventure<T extends keyof IframeQueryMap>(
    content: IframeQuery<T>,
    transfer?: Transferable[]
): Promise<IframeQueryMap[T]["answer"]> {
    return new Promise<IframeQueryMap[T]["answer"]>((resolve, reject) => {
        window.parent.postMessage(
            {
                id: queryNumber,
                query: content,
            } as IframeQueryWrapper<T>,
            "*",
            transfer
        );

        answerPromises.set(queryNumber, {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            resolve,
            reject,
        });

        queryNumber++;
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
