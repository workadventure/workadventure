export class LocalUser {
    constructor(
        public readonly uuid: string,
        public email: string | null = null,
        public matrixUserId: string | null = null,
        public isMatrixRegistered: boolean = false
    ) {}
}
