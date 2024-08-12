export class SpaceAlreadyExistError extends Error {
    constructor(spaceName: string) {
        super(`Space ${spaceName} already exists`);
    }
}
export class SpaceDoesNotExistError extends Error {
    constructor(spaceName: string) {
        super(`Space ${spaceName} does not exists`);
    }
}
export class UserAlreadyExistInSpaceError extends Error {
    constructor(spaceName: string, spaceUserName: string) {
        super(`User ${spaceUserName}  already exist in  Space ${spaceName} `);
    }
}
export class UserDoesNotExistInSpaceError extends Error {
    constructor(spaceName: string, spaceUserName: string) {
        super(`User ${spaceUserName}  is not in  Space ${spaceName} `);
    }
}

export class SpaceNameIsEmptyError extends Error {
    constructor() {
        super(`Space should not be empty`);
    }
}

export class SpaceFilterDoesNotExistError extends Error {
    constructor(spaceName: string, filterName: string) {
        super(`filter ${filterName} does not exist in space ${spaceName} `);
    }
}
