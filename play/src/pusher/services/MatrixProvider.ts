import {MATRIX_DOMAIN} from "../enums/EnvironmentVariable";

export class MatrixProvider{
    static getMatrixIdFromEmail(email: string): string{
        return '@'+email.replace('@', '_')+':'+MATRIX_DOMAIN;
    }
}
