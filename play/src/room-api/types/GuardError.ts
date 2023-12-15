import { Status } from "@grpc/grpc-js/build/src/constants";

export class GuardError extends Error {
    constructor(public readonly code: Status, public readonly details: string) {
        super(details);
    }
}
