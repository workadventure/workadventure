import { readable, type Readable, type Unsubscriber } from "svelte/store";
import type { ChatQuestionItem, ChatQuestionState } from "../../Connection/ChatConnection";

export type QuestionStateRow = {
    question: ChatQuestionItem;
    state: ChatQuestionState;
};

export function createQuestionStateRowsStore(
    questionItems: Readable<readonly ChatQuestionItem[]>,
): Readable<readonly QuestionStateRow[]> {
    return readable<readonly QuestionStateRow[]>([], (set) => {
        let stateUnsubscribers: Unsubscriber[] = [];
        let latestQuestions: readonly ChatQuestionItem[] = [];
        let latestStates = new Map<string, ChatQuestionState>();

        const emitRows = () => {
            set(
                latestQuestions.flatMap((question) => {
                    const state = latestStates.get(question.id);
                    return state ? [{ question, state }] : [];
                }),
            );
        };

        const unsubscribeQuestions = questionItems.subscribe((questions) => {
            for (const unsubscribe of stateUnsubscribers) {
                unsubscribe();
            }

            stateUnsubscribers = [];
            latestQuestions = questions;
            latestStates = new Map();

            for (const question of questions) {
                stateUnsubscribers.push(
                    question.state.subscribe((state) => {
                        latestStates.set(question.id, state);
                        emitRows();
                    }),
                );
            }

            emitRows();
        });

        return () => {
            unsubscribeQuestions();
            for (const unsubscribe of stateUnsubscribers) {
                unsubscribe();
            }
        };
    });
}
