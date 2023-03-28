import { API_TOKEN } from "./../Environement/Environement";
// import Express, Request, Response and NextFunction
import { Express, Request, Response, NextFunction } from 'express';

// create middleware class to check if the request has a valid token
export class AccessMiddleware {
    constructor(private server: Express) {
        this.checkToken();
    }

    // create middleware function to check if the request has a valid token
    public checkToken(): void {
        this.server.use((req: Request, res: Response, next: NextFunction) => {
            // get token from request header
            const token = req.header('Authorization');

            // check if token is valid
            if (token === API_TOKEN) {
                next();
            } else {
                res.status(401).send('Invalid token');
            }
        });
    }
}
