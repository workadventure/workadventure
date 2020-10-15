import {ALLOW_ARTILLERY, SECRET_KEY} from "../Enum/EnvironmentVariable";
import {uuid} from "uuidv4";
import Jwt from "jsonwebtoken";
import {TokenInterface} from "../Controller/AuthenticateController";

class JWTTokenManager {
    
    public createJWTToken(userUuid: string) {
        return Jwt.sign({userUuid: userUuid}, SECRET_KEY, {expiresIn: '200d'}); //todo: add a mechanic to refresh or recreate token
    }

    public async getUserUuidFromToken(token: unknown): Promise<string> {

        if (!token) {
            throw new Error('An authentication error happened, a user tried to connect without a token.');
        }
        if (typeof(token) !== "string") {
            throw new Error('Token is expected to be a string');
        }


        if(token === 'test') {
            if (ALLOW_ARTILLERY) {
                return uuid();
            } else {
                throw new Error("In order to perform a load-testing test on this environment, you must set the ALLOW_ARTILLERY environment variable to 'true'");
            }
        }

        return new Promise<string>((resolve, reject) => {
            Jwt.verify(token, SECRET_KEY,  {},(err, tokenDecoded) => {
                const tokenInterface = tokenDecoded as TokenInterface;
                if (err) {
                    console.error('An authentication error happened, invalid JsonWebToken.', err);
                    reject(new Error('An authentication error happened, invalid JsonWebToken. '+err.message));
                    return;
                }
                if (tokenDecoded === undefined) {
                    console.error('Empty token found.');
                    reject(new Error('Empty token found.'));
                    return;
                }

                if (!this.isValidToken(tokenInterface)) {
                    reject(new Error('Authentication error, invalid token structure.'));
                    return;
                }

                resolve(tokenInterface.userUuid);
            });
        });
    }

    private isValidToken(token: object): token is TokenInterface {
        return !(typeof((token as TokenInterface).userUuid) !== 'string');
    }
    
}

export const jwtTokenManager = new JWTTokenManager();