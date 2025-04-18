import { MatrixEvent, Relations, RelationsEvent } from "matrix-js-sdk";
import { MatrixChatMessage } from "./MatrixChatMessage";

export class MatrixChatRelation {
    private handleRelationAdd: (event: MatrixEvent) => void;
    private handleRelationRemove: (event: MatrixEvent) => void;
    private handleRelationRedaction: (event: MatrixEvent) => void;

    constructor(private message: MatrixChatMessage, private relation: Relations) {
        this.handleRelationAdd = this.onClientEventAddRelation.bind(this);
        this.handleRelationRemove = this.onClientEventRemoveRelation.bind(this);
        this.handleRelationRedaction = this.onClientEventRedactionRelation.bind(this);

        this.relation.on(RelationsEvent.Add, this.handleRelationAdd);

        this.relation.on(RelationsEvent.Remove, this.handleRelationRemove);

        this.relation.on(RelationsEvent.Redaction, this.handleRelationRedaction);
    }

    private onClientEventAddRelation() {
        this.message.initReactions();
    }
    private onClientEventRemoveRelation() {
        this.message.initReactions();
    }
    private onClientEventRedactionRelation() {
        this.message.initReactions();
    }

    public destroy() {
        this.relation.off(RelationsEvent.Add, this.handleRelationAdd);
        this.relation.off(RelationsEvent.Remove, this.handleRelationRemove);
        this.relation.off(RelationsEvent.Redaction, this.handleRelationRedaction);
    }
}
