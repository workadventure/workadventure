import { randomUUID } from "node:crypto";
import type { SpaceUser } from "@workadventure/messages";
import type { ProximityQuestion } from "@workadventure/shared-utils";
import { PROXIMITY_QA_SENDER_NAME_MAX_LENGTH, proximityQuestionSchema } from "@workadventure/shared-utils";
import type { SpaceStateHost } from "./SpaceStateHost";
import { isAdmin, voterIdOf } from "./SpaceStateHost";

/**
 * Owns the `questions` of a space's state. Ids and timestamps are generated here and every action is attributed
 * to the sender.
 */
export class ProximityQAManager {
    constructor(private readonly space: SpaceStateHost) {}

    public ask(sender: SpaceUser, body: string): void {
        const question: ProximityQuestion = proximityQuestionSchema.parse({
            id: randomUUID(),
            body,
            senderId: voterIdOf(sender),
            senderName: sender.name.slice(0, PROXIMITY_QA_SENDER_NAME_MAX_LENGTH),
            createdAt: Date.now(),
            upvotes: {},
        });
        this.space.updateState((state) => {
            state.questions[question.id] = question;
        });
    }

    public upvote(sender: SpaceUser, questionId: string, upvoted: boolean): void {
        const question = this.getQuestion(questionId);
        const voterId = voterIdOf(sender);
        if (question.senderId === voterId) {
            throw new Error("Question authors cannot upvote their own question");
        }
        if (question.answer) {
            throw new Error("This question has already been answered");
        }
        this.space.updateState((state) => {
            const upvotes = state.questions[questionId].upvotes;
            if (upvoted) {
                upvotes[voterId] ??= Date.now();
            } else {
                delete upvotes[voterId];
            }
        });
    }

    public markAnswered(sender: SpaceUser, questionId: string): void {
        if (!isAdmin(sender) && !sender.megaphoneState) {
            throw new Error("Only moderators can mark a question as answered");
        }
        if (this.getQuestion(questionId).answer) {
            return;
        }
        this.space.updateState((state) => {
            state.questions[questionId].answer = { moderatorId: voterIdOf(sender), answeredAt: Date.now() };
        });
    }

    public delete(sender: SpaceUser, questionId: string): void {
        if (this.getQuestion(questionId).senderId !== voterIdOf(sender) && !isAdmin(sender)) {
            throw new Error("Only question authors or admins can delete a question");
        }
        this.space.updateState((state) => {
            delete state.questions[questionId];
        });
    }

    private getQuestion(questionId: string): Readonly<ProximityQuestion> {
        const question = this.space.getState().questions[questionId];
        if (!question) {
            throw new Error(`Question ${questionId} does not exist in this space`);
        }
        return question;
    }
}
