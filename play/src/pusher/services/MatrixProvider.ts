import {MATRIX_API_URI, MATRIX_DOMAIN} from "../enums/EnvironmentVariable";
import axios from "axios";

class MatrixProvider{
    private accessToken: string | undefined;
    private lastAccessTokenDate: number = Date.now();
    getMatrixIdFromEmail(email: string): string{
        return '@'+this.getBareMatrixIdFromEmail(email)+':'+MATRIX_DOMAIN;
    }

    getBareMatrixIdFromEmail(email: string): string{
        return email.replace('@', '_');
    }

    async getAccessToken(): Promise<string> {
        if((this.accessToken && this.lastAccessTokenDate && Date.now() - this.lastAccessTokenDate > 3_600_000) || !this.accessToken) {
            await axios.post(`${MATRIX_API_URI}_matrix/client/r0/login`, {
                type: 'm.login.password',
                user: process.env.MATRIX_ADMIN_USER,
                password: process.env.MATRIX_ADMIN_PASSWORD
            }).then(response => {
                if (response.status === 200 && response.data.errcode === undefined) {
                    this.accessToken = response.data.access_token;
                    this.lastAccessTokenDate = Date.now();
                    return Promise.resolve();
                } else {
                    return Promise.reject();
                }
            });
        }
        if(!this.accessToken) {
            throw new Error("No access token found");
        }
        return this.accessToken;
    }

    async setNewMatrixPassword(matrixUserId: string, password: string): Promise<void> {
        return await axios.put(`${MATRIX_API_URI}_synapse/admin/v2/users/${matrixUserId}`, {
            logout_devices: false,
            password
        }, {
            headers: {
                "Authorization": "Bearer " + await this.getAccessToken(),
            }
        }).then(response => {
            if (response.status === 200) {
                return Promise.resolve();
            } else {
                return Promise.reject("Fail");
            }
        })
    }
}

export const matrixProvider = new MatrixProvider();
