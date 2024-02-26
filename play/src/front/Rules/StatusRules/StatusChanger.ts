import { StatusStrategyInterface } from "../StatusStrategyInterface";
import { AvailabilityStatus } from "../../../../../libs/messages";
import { BasicStatusStrategy } from "./StatusStrategy/BasicStatusStrategy";
import { StatusRulesVerificationInterface } from "./statusRules";
import { UnvalidStatusTransitionError } from "./Errors/UnvalidStatusTransitionError";

export interface StatusStrategyFactoryInterface {
    createStrategy: (newStatus: AvailabilityStatus) => StatusStrategyInterface;
}

export class StatusChanger {
    constructor(
        private rulesVerification: StatusRulesVerificationInterface,
        private StatusStrategyFactory: StatusStrategyFactoryInterface,
        private statusStrategy: StatusStrategyInterface = new BasicStatusStrategy()
    ) {
        this.statusStrategy.applyAllRules();
    }
    getActualStatus(): AvailabilityStatus {
        return this.statusStrategy.getActualStatus();
    }
    changeStatusTo(newStatus: AvailabilityStatus) {
        if (!this.rulesVerification.canChangeStatus(this.statusStrategy.getActualStatus()).to(newStatus)) {
            throw new UnvalidStatusTransitionError("");
        }
        this.statusStrategy.cleanTimedRules();
        this.setStrategy(newStatus);
        this.statusStrategy.applyAllRules();
    }

    setStrategy(newStatus: AvailabilityStatus) {
        this.statusStrategy = this.StatusStrategyFactory.createStrategy(newStatus);
    }

    setUserNameInteraction(name: string) {
        this.statusStrategy.setUserNameInteraction(name);
    }

    applyInteractionRules() {
        this.statusStrategy.applyInteractionRules();
    }
    allowNotificationSound(): boolean {
        return this.statusStrategy.allowNotificationSound();
    }

    applyTimedRules(): void {
        this.statusStrategy.applyTimedRules();
    }
}
