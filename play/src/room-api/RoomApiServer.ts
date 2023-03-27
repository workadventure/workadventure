import { RoomApiServer as RoomApiServerInterface } from "@workadventure/messages/src/ts-proto-generated/room-api";
import { Status } from "@grpc/grpc-js/build/src/constants";
import { apiClientRepository } from "../pusher/services/ApiClientRepository";
import AuthenticationGuard from "./guards/AuthenticationGuard";

export default {
    readVariable: function (call, callback) {
        AuthenticationGuard(call.metadata, call.request.room)
            .then((authentication) => {
                if (!authentication.success) {
                    return callback({
                        code: authentication.code,
                        details: authentication.details,
                    });
                }

                apiClientRepository
                    .getClient("room-api:" + call.request.room)
                    .then((apiClient) => {
                        apiClient.readVariable(call.request, (error, response) => {
                            if (error) {
                                return callback(error);
                            }

                            callback(null, response);
                        });
                    })
                    .catch((error) => {
                        console.error("Internal authentication error:", error);
                        return callback({
                            code: Status.INTERNAL,
                            details: "Internal error, please contact us!",
                        });
                    });
            })
            .catch((error) => {
                return callback({
                    code: error.code,
                    details: error.details,
                });
            });
    },
    listenVariable: (call) => {
        AuthenticationGuard(call.metadata, call.request.room)
            .then((authentication) => {
                if (!authentication.success) {
                    call.destroy(new Error(authentication.details));
                    return;
                }

                apiClientRepository
                    .getClient("room-api:" + call.request.room)
                    .then((apiClient) => {
                        const variableListener = apiClient.listenVariable(call.request);

                        variableListener.on("data", (response) => {
                            console.log(response);
                            call.write(response);
                        });

                        variableListener.on("cancelled", () => {
                            call.end();
                        });

                        variableListener.on("error", (e) => {
                            call.end(e);
                        });

                        call.on("cancelled", () => {
                            variableListener.cancel();
                            call.end();
                        }).on("error", (e) => {
                            variableListener.cancel();
                            call.end();
                        });
                    })
                    .catch((error) => {
                        console.error("Error on creating api client!", error);
                        call.destroy(new Error("Internal error, please contact us!"));
                        return;
                    });
            })
            .catch((error) => {
                return call.destroy(new Error("Internal authentication error"));
            });
    },
    saveVariable: (call, callback) => {
        AuthenticationGuard(call.metadata, call.request.room)
            .then((authentication) => {
                if (!authentication.success) {
                    return callback({
                        code: authentication.code,
                        details: authentication.details,
                    });
                }

                apiClientRepository
                    .getClient("room-api:" + call.request.room)
                    .then((apiClient) => {
                        apiClient.saveVariable(call.request, (error, response) => {
                            if (error) {
                                return callback(error);
                            }

                            callback(null, response);
                        });
                    })
                    .catch((error) => {
                        console.error("Error on creating api client!", error);
                        return callback({
                            code: Status.INTERNAL,
                            details: "Internal error, please contact us!",
                        });
                    });
            })
            .catch((error) => {
                return callback({
                    code: error.code,
                    details: error.details,
                });
            });
    },
} satisfies RoomApiServerInterface;
