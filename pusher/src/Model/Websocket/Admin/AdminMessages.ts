import * as tg from "generic-type-guard";

export const isBanBannedAdminMessageInterface = new tg.IsInterface()
    .withProperties({
        type: tg.isSingletonStringUnion("ban", "banned"),
        message: tg.isString,
        userUuid: tg.isString,
    })
    .get();

export const isUserMessageAdminMessageInterface = new tg.IsInterface()
    .withProperties({
        event: tg.isSingletonString("user-message"),
        message: isBanBannedAdminMessageInterface,
        world: tg.isString,
        jwt: tg.isString,
    })
    .get();

export const isListenRoomsMessageInterface = new tg.IsInterface()
    .withProperties({
        event: tg.isSingletonString("listen"),
        roomIds: tg.isArray(tg.isString),
        jwt: tg.isString,
    })
    .get();

export const isAdminMessageInterface = tg.isUnion(isUserMessageAdminMessageInterface, isListenRoomsMessageInterface);

export type AdminMessageInterface = tg.GuardedType<typeof isAdminMessageInterface>;
