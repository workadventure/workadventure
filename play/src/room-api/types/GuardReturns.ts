import { Status } from "@grpc/grpc-js/build/src/constants";

export type GuardReturnsError = {
    success: false;
    code: Status;
    details: string;
};

export type GuardReturnsSuccess = {
    success: true;
};

export type GuardReturns = GuardReturnsSuccess | GuardReturnsError;
