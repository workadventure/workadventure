import { z } from "zod";
import { NewSpaceUserEvent } from "./NewSpaceUserEvent";

/**
 * List of events that can open a message channel/port between the game and the iFrame.
 * For each message port, we define a type (key), zod validator for data passed on creation, and the
 * list of events that can be sent and received through this message port.
 */
export const iframeMessagePortTypeGuards = {
    joinSpace: {
        data: z.object({
            spaceName: z.string(),
            filterType: z.enum(["everyone", "streaming"]),
            //TODO : voir si on peut pas faire mieux niveau typage pour avoir direct les propriétés à sync
            propertiesToSync: z.array(z.string()),
        }),
        iframeEvents: z.union([
            z.object({
                type: z.literal("watch"),
                data: z.undefined(),
            }),
            z.object({
                type: z.literal("unwatch"),
                data: z.undefined(),
            }),
            z.object({
                type: z.literal("leave"),
                data: z.undefined(),
            }),
            z.object({
                type: z.literal("startStreaming"),
                data: z.undefined(),
            }),
            z.object({
                type: z.literal("stopStreaming"),
                data: z.undefined(),
            }),
        ]),
        workAdventureEvents: z.union([
            z.object({
                type: z.literal("onNewUser"),
                data: NewSpaceUserEvent,
            }),
            z.object({
                type: z.literal("onDeleteUser"),
                data: z.object({
                    spaceUserId: z.string(),
                }),
            }),
            z.object({
                type: z.literal("onUpdateUser"),
                data: z.object({
                    spaceUserId: z.string(),
                    changes: NewSpaceUserEvent.partial(),
                    updateMask: z.array(z.string()),
                }),
            }),
        ]),
    },
};

type IframeMessagePortTypeGuards = typeof iframeMessagePortTypeGuards;

export type IframeMessagePortMap = {
    [key in keyof IframeMessagePortTypeGuards]: {
        data: z.infer<IframeMessagePortTypeGuards[key]["data"]>;
        iframeEvents: z.infer<IframeMessagePortTypeGuards[key]["iframeEvents"]>;
        workAdventureEvents: IframeMessagePortTypeGuards[key]["workAdventureEvents"];
    };
};

export interface IframeMessagePortData<T extends keyof IframeMessagePortMap> {
    type: T;
    data: IframeMessagePortMap[T]["data"];
}

export interface MessagePortIframeEvent<T extends keyof IframeMessagePortMap> {
    type: T;
    data: IframeMessagePortMap[T]["iframeEvents"];
}

export interface MessagePortWorkAdventureEvent<T extends keyof IframeMessagePortMap> {
    type: T;
    data: IframeMessagePortMap[T]["workAdventureEvents"];
}

export const isIframeMessagePortType = (type: string): type is keyof IframeMessagePortMap => {
    return type in iframeMessagePortTypeGuards;
};

export interface IframeMessagePortWrapper<T extends keyof IframeMessagePortMap> {
    messagePort: true;
    id: number;
    type: T;
    data: IframeMessagePortMap[T]["data"];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isIframeMessagePortWrapper = (event: any): event is IframeMessagePortWrapper<keyof IframeMessagePortMap> =>
    typeof event === "object" &&
    event.messagePort === true &&
    typeof event.type === "string" &&
    z.number().safeParse(event.id).success &&
    isIframeMessagePortType(event.type) &&
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    iframeMessagePortTypeGuards[event.type].data.safeParse(event.data).success;

export const isIframeErrorMessagePortEvent = z.object({
    id: z.number(),
    error: z.string(),
    messagePort: z.literal(true),
});

/**
 * A message sent from the game to the iFrame when an error occurs while processing a message port opening.
 */
export type IframeErrorMessagePortEvent = z.infer<typeof isIframeErrorMessagePortEvent>;

export const isIframeSuccessMessagePortEvent = z.object({
    id: z.number(),
    messagePort: z.literal(true),
});

/**
 * A message sent from the game to the iFrame when an error occurs while processing a message port opening.
 */
export type IframeSuccessMessagePortEvent = z.infer<typeof isIframeSuccessMessagePortEvent>;
