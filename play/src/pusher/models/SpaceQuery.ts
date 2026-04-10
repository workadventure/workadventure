import type { SpaceAnswerMessage, SpaceQueryMessage } from "@workadventure/messages";
import { asError } from "catch-unknown";
import type { Space } from "./Space";

export class Query {
    private readonly _queries = new Map<
        number,
        {
            answerType: string;
            resolve: (message: Required<SpaceAnswerMessage>["answer"]) => void;
            reject: (e: unknown) => void;
        }
    >();
    private _lastQueryId = 0;

    constructor(private readonly _space: Space) {}

    public async send<T extends Required<SpaceQueryMessage>["query"]>(
        message: T,
        options?: {
            // Timeout in milliseconds. Defaults to 10000 (10 seconds)
            timeout?: number;
            signal?: AbortSignal;
        }
    ): Promise<Required<SpaceAnswerMessage>["answer"]> {
        const connection = await this._space.spaceStreamToBackPromise;
        if (!connection || connection.closed) {
            throw new Error("Connection to the back is closed");
        }

        const signals: AbortSignal[] = [];
        if (options?.signal) {
            signals.push(options.signal);
        }
        const timeout = options?.timeout ?? 10000;
        signals.push(AbortSignal.timeout(timeout));
        const finalSignal = AbortSignal.any(signals);

        if (!message.$case.endsWith("Query")) {
            throw new Error("Query types are supposed to be suffixed with Query");
        }
        return new Promise((resolve, reject) => {
            if (finalSignal.aborted) {
                reject(asError(finalSignal.reason));
                return;
            }
            const answerType = message.$case.substring(0, message.$case.length - 5) + "Answer";

            this._queries.set(this._lastQueryId, {
                answerType,
                resolve,
                reject,
            });

            this._space.forwarder.forwardMessageToSpaceBack({
                $case: "spaceQueryMessage",
                spaceQueryMessage: {
                    id: this._lastQueryId,
                    spaceName: this._space.name,
                    query: message,
                },
            });

            finalSignal.addEventListener(
                "abort",
                () => {
                    reject(asError(finalSignal.reason));
                    this._queries.delete(this._lastQueryId);

                    // TODO: we can improve this by sending a cancellation message to the back
                },
                { once: true }
            );

            this._lastQueryId++;
        });
    }

    public receiveAnswer(queryId: number, answer: Required<SpaceAnswerMessage>["answer"]) {
        if (answer === undefined) {
            throw new Error("Invalid message received. Answer missing.");
        }

        const query = this._queries.get(queryId);
        if (query === undefined) {
            console.error(
                "Received an answer for a query we have no record of. This might mean we received an answer after a query timeout.",
                queryId,
                answer
            );
            return;
        }

        if (answer.$case === "error") {
            query.reject(new Error("Error received from the back: " + answer.error.message));
            return;
        } else {
            query.resolve(answer);
        }

        this._queries.delete(queryId);
    }

    public destroy() {
        for (const query of this._queries.values()) {
            query.reject(new Error("Query cancelled because the space is being destroyed"));
        }
    }
}
