import { v4 } from 'uuid';
import {HttpRequest, HttpResponse, TemplatedApp} from "uWebSockets.js";
import {BaseController} from "./BaseController";
import {adminApi} from "../Services/AdminApi";
import {jwtTokenManager} from "../Services/JWTTokenManager";
import {parse} from "query-string";

export interface TokenInterface {
    userUuid: string
}

export class AuthenticateController extends BaseController {

    constructor(private App : TemplatedApp) {
        super();
        this.register();
        this.verify();
        this.anonymLogin();
        this.userRegister();
        this.userLogin();
        this.forgotPassword();
    }

    //Try to login with an admin token
    private register(){
        this.App.options("/register", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.end();
        });

        this.App.post("/register", (res: HttpResponse, req: HttpRequest) => {
            (async () => {
                res.onAborted(() => {
                    console.warn('Login request was aborted');
                })
                const param = await res.json();

                //todo: what to do if the organizationMemberToken is already used?
                const organizationMemberToken:string|null = param.organizationMemberToken;

                try {
                    if (typeof organizationMemberToken != 'string') throw new Error('No organization token');
                    const data = await adminApi.fetchMemberDataByToken(organizationMemberToken);
                    const userUuid = data.userUuid;
                    const organizationSlug = data.organizationSlug;
                    const worldSlug = data.worldSlug;
                    const roomSlug = data.roomSlug;
                    const mapUrlStart = data.mapUrlStart;
                    const textures = data.textures;

                    const authToken = jwtTokenManager.createJWTToken(userUuid);
                    res.writeStatus("200 OK");
                    this.addCorsHeaders(res);
                    res.end(JSON.stringify({
                        authToken,
                        userUuid,
                        organizationSlug,
                        worldSlug,
                        roomSlug,
                        mapUrlStart,
                        textures
                    }));

                } catch (e) {
                    console.error("An error happened", e)
                    res.writeStatus(e.status || "500 Internal Server Error");
                    this.addCorsHeaders(res);
                    res.end('An error happened');
                }


            })();
        });

    }

    private verify(){
        this.App.options("/verify", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.end();
        });

        this.App.get("/verify", (res: HttpResponse, req: HttpRequest) => {
            (async () => {
                const query = parse(req.getQuery());

                res.onAborted(() => {
                    console.warn('verify request was aborted');
                })

                try {
                    await jwtTokenManager.getUserUuidFromToken(query.token as string);
                } catch (e) {
                    res.writeStatus("400 Bad Request");
                    this.addCorsHeaders(res);
                    res.end(JSON.stringify({
                        "success": false,
                        "message": "Invalid JWT token"
                    }));
                    return;
                }
                res.writeStatus("200 OK");
                this.addCorsHeaders(res);
                res.end(JSON.stringify({
                    "success": true
                }));
            })();
        });

    }

    //permit to login on application. Return token to connect on Websocket IO.
    private anonymLogin(){
        this.App.options("/anonymLogin", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.end();
        });

        this.App.post("/anonymLogin", (res: HttpResponse, req: HttpRequest) => {

            res.onAborted(() => {
                console.warn('Login request was aborted');
            })

            const userUuid = v4();
            const authToken = jwtTokenManager.createJWTToken(userUuid);
            res.writeStatus("200 OK");
            this.addCorsHeaders(res);
            res.end(JSON.stringify({
                authToken,
                userUuid,
            }));
        });
    }

    private userLogin(){
        this.App.options("/user/login", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);
            res.end();
        });

        this.App.post("/user/login", (res: HttpResponse, req: HttpRequest) => {

            (async () => {
                res.onAborted(() => {
                    console.warn('Login request was aborted');
                })

                let userUuid = '';
                try {
                    const params = await res.json();

                    const response = await adminApi.loginUser(params.email as string, params.password as string);
                    userUuid = response.data.uuid as string;
                    const authToken = jwtTokenManager.createJWTToken(userUuid);
                    res.writeStatus("200 OK");
                    this.addCorsHeaders(res);
                    res.end(JSON.stringify({
                        authToken,
                        userUuid,
                        user: response.data
                    }));
                }catch (err){
                    res.writeStatus("400 KO");
                    this.addCorsHeaders(res);
                    res.end(JSON.stringify({
                        message: 'Email or password incorrect'
                    }));
                }
            })();
        });
    }

    private userRegister(){
        this.App.options("/user/register", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);
            res.end();
        });

        this.App.post("/user/register", (res: HttpResponse, req: HttpRequest) => {

            (async () => {

                res.onAborted(() => {
                    console.warn('Register request was aborted');
                })

                let userUuid = '';
                try {
                    const params = await res.json();

                    const response = await adminApi.register(
                        params.name as string,
                        params.email as string,
                        params.password as string
                    );
                    userUuid = response.data.uuid as string;
                    const authToken = jwtTokenManager.createJWTToken(userUuid);
                    res.writeStatus("200 OK");
                    this.addCorsHeaders(res);
                    res.end(JSON.stringify({
                        authToken,
                        userUuid,
                        user: response.data
                    }));
                }catch (err){
                    res.writeStatus("400 KO");
                    this.addCorsHeaders(res);
                    res.end(JSON.stringify({
                        message: err.message
                    }));
                }
            })();
        });
    }

    private forgotPassword() {
        this.App.options("/user/password/reset", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);
            res.end();
        });

        this.App.post("/user/password/reset", (res: HttpResponse, req: HttpRequest) => {

            (async () => {

                res.onAborted(() => {
                    console.warn('Forgot password request was aborted');
                });

                try {
                    const params = await res.json();
                    await adminApi.forgotPassword(params.email as string);
                    res.writeStatus("200 OK");
                    this.addCorsHeaders(res);
                    res.end(JSON.stringify({
                        message: 'Email sent!'
                    }));
                } catch (err) {
                    res.writeStatus("400 KO");
                    this.addCorsHeaders(res);
                    res.end(JSON.stringify({
                        message: err.message
                    }));
                }

            })();
        });
    }
}
