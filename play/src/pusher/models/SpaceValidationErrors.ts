/**
 * Custom errors for space registration/validation.
 * Used to identify expected cases and optionally avoid sending them to Sentry.
 */

/** Thrown when spaceUserId is missing on the socket. */
export class SpaceUserIdNotFoundError extends Error {
    constructor(message = "Space user id not found", options?: { cause?: Error }) {
        super(message, options);
        this.name = "SpaceUserIdNotFoundError";
    }
}

/** Thrown when the user is already in the space's local connected users (duplicate add). */
export class UserAlreadyAddedInSpaceError extends Error {
    constructor(
        message: string,
        public readonly spaceName: string,
        public readonly spaceUserId: string,
        options?: { cause?: Error }
    ) {
        super(message, options);
        this.name = "UserAlreadyAddedInSpaceError";
    }
}

/** Thrown when the socket is already registered in the space. */
export class SocketAlreadyRegisteredInSpaceError extends Error {
    constructor(message: string, public readonly spaceName: string, options?: { cause?: Error }) {
        super(message, options);
        this.name = "SocketAlreadyRegisteredInSpaceError";
    }
}

/** Thrown when the user is trying to join a space they are already in (according to socketData.spaces). */
export class UserAlreadyInSpaceError extends Error {
    constructor(
        message: string,
        public readonly spaceName: string,
        public readonly userName: string,
        options?: { cause?: Error }
    ) {
        super(message, options);
        this.name = "UserAlreadyInSpaceError";
    }
}

/**
 * Thrown when a client attempts an operation on a space they are not part of.
 * Used to avoid sending expected validation errors to Sentry.
 */
export class ClientNotPartOfSpaceError extends Error {
    constructor(message: string, public readonly spaceName: string, options?: { cause?: Error }) {
        super(message, options);
        this.name = "ClientNotPartOfSpaceError";
    }
}
