import { SpaceAnswerMessage, SpaceQueryMessage } from "@workadventure/messages";
import { Space } from "./Space";

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

    public send<T extends Required<SpaceQueryMessage>["query"]>(
        message: T
    ): Promise<Required<SpaceAnswerMessage>["answer"]> {
        return new Promise((resolve, reject) => {
            if (!message.$case.endsWith("Query")) {
                throw new Error("Query types are supposed to be suffixed with Query");
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

            this._lastQueryId++;
        });
    }

    public receiveAnswer(queryId: number, answer: Required<SpaceAnswerMessage>["answer"]) {
        if (answer === undefined) {
            throw new Error("Invalid message received. Answer missing.");
        }

        const query = this._queries.get(queryId);
        if (query === undefined) {
            throw new Error("Got an answer to a query we have no track of: " + queryId.toString());
        }

        if (answer.$case === "error") {
            query.reject(new Error("Error received from the back: " + answer.error.message));
            return;
        } else {
            query.resolve(answer);
        }

        this._queries.delete(queryId);
    }
}
