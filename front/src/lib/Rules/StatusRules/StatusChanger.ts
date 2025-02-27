import { AvailabilityStatus } from "@workadventure/messages";
import { StatusStrategyInterface } from "./StatusStrategyInterface";
import { BasicStatusStrategy } from "./StatusStrategy/BasicStatusStrategy";
import { StatusRulesVerificationInterface } from "./statusRules";
import { InvalidStatusTransitionError } from "./Errors/InvalidStatusTransitionError";

export interface StatusStrategyFactoryInterface {
    createStrategy: (newStatus: AvailabilityStatus) => StatusStrategyInterface;
}

export class StatusChanger {
    constructor(
        private _rulesVerification: StatusRulesVerificationInterface,
        private _StatusStrategyFactory: StatusStrategyFactoryInterface,
        private _statusStrategy: StatusStrategyInterface = new BasicStatusStrategy()
    ) {
        this._statusStrategy.applyAllRules();
    }
    getActualStatus(): AvailabilityStatus {
        return this._statusStrategy.getActualStatus();
    }
    changeStatusTo(newStatus: AvailabilityStatus) {
        if (!this._rulesVerification.canChangeStatus(this._statusStrategy.getActualStatus()).to(newStatus)) {
            throw new InvalidStatusTransitionError("");
        }
        this._statusStrategy.cleanTimedRules();
        this.setStrategy(newStatus);
        this._statusStrategy.applyAllRules();
    }

    private setStrategy(newStatus: AvailabilityStatus) {
        this._statusStrategy = this._StatusStrategyFactory.createStrategy(newStatus);
    }

    setUserNameInteraction(name: string) {
        this._statusStrategy.setUserNameInteraction(name);
    }

    applyInteractionRules() {
        this._statusStrategy.applyInteractionRules();
    }
    allowNotificationSound(): boolean {
        return this._statusStrategy.allowNotificationSound();
    }

    applyTimedRules(): void {
        this._statusStrategy.applyTimedRules();
    }
}
