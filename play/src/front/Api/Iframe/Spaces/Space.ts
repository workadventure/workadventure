import { BehaviorSubject, Observable, Subject, Subscriber, Subscription } from "rxjs";
import { merge } from "lodash";
import { CheckedIframeMessagePort } from "../CheckedIframeMessagePort";
import { NewSpaceUserEvent } from "../../Events/NewSpaceUserEvent";
import { SpaceUser, ReactiveSpaceUser } from "./SpaceUser";

export class Space {
    private watchCount = 0;
    private messagesSubscription: Subscription;
    private readonly users: Map<string, SpaceUser> = new Map<string, SpaceUser>();
    public readonly userJoinedObservable: Observable<SpaceUser>;
    public readonly userLeftObservable: Observable<SpaceUser>;
    private _userJoinedSubscriber: Subscriber<SpaceUser> | undefined;
    private _userLeftSubscriber: Subscriber<SpaceUser> | undefined;
    private left = false;

    constructor(private readonly port: CheckedIframeMessagePort<"joinSpace">) {
        this.messagesSubscription = this.port.messages.subscribe((event) => {
            switch (event.data.type) {
                case "onNewUser": {
                    if (this.users.has(event.data.data.spaceUserId)) {
                        throw new Error(`User already exists in the space: ${event.data.data.spaceUserId}`);
                    }

                    const user = {
                        ...event.data.data,
                        reactiveUser: this.createReactiveUser(event.data.data),
                    };

                    this.users.set(event.data.data.spaceUserId, user);
                    this._userJoinedSubscriber?.next(user);
                    break;
                }
                case "onDeleteUser": {
                    this._userLeftSubscriber?.next(this.users.get(event.data.data.spaceUserId));
                    this.users.delete(event.data.data.spaceUserId);
                    break;
                }
                case "onUpdateUser": {
                    const user = this.users.get(event.data.data.spaceUserId);
                    if (!user) {
                        throw new Error(`User not found in the space: ${event.data.data.spaceUserId}`);
                    }

                    // Update the user with the changes
                    merge(user, event.data.data.changes);

                    for (const key in event.data.data.changes) {
                        // We allow ourselves a not 100% exact type cast here.
                        // Technically, newData could contain any key, not only keys part of SpaceUser type (because additional keys
                        // are allowed in Javascript objects)
                        // However, we know for sure that the keys of newData are part of SpaceUser type, so we can safely cast them.
                        const castKey = key as keyof Omit<SpaceUser, "spaceUserId">;
                        // Out of security, we add a runtime check to ensure that the key is part of SpaceUser type
                        if (castKey in user) {
                            // Finally, we cast the "Observable" to "Subject" to be able to update the value. We know for sure it is
                            // writable because the only place that can create a "ReactiveSpaceUser" is the "extendSpaceUser" method.
                            const subject = user.reactiveUser[castKey];
                            if (subject instanceof Subject) {
                                subject.next(user[castKey]);
                            }
                        }
                    }

                    // Notify the subscribers about the update
                    this._userJoinedSubscriber?.next(user);
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = event.data;
                }
            }
        });

        this.userJoinedObservable = new Observable<SpaceUser>((subscriber) => {
            this.watch();
            this._userJoinedSubscriber = subscriber;

            return () => {
                this.unwatch();
            };
        });

        this.userLeftObservable = new Observable<SpaceUser>((subscriber) => {
            this.watch();
            this._userLeftSubscriber = subscriber;

            return () => {
                this.unwatch();
            };
        });
    }

    private createReactiveUser(user: NewSpaceUserEvent): ReactiveSpaceUser {
        return new Proxy(
            {
                spaceUserId: user.spaceUserId,
            } as unknown as ReactiveSpaceUser,
            {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                get(target: any, property: PropertyKey, receiver: unknown) {
                    if (typeof property !== "string") {
                        return Reflect.get(target, property, receiver);
                    }

                    if (target[property as keyof ReactiveSpaceUser]) {
                        return target[property as keyof ReactiveSpaceUser];
                    } else {
                        if (property in user) {
                            //@ts-ignore We check just above that the property is in user
                            target[property] = new BehaviorSubject(user[property]);
                            return target[property];
                        } else {
                            return Reflect.get(target, property, receiver);
                        }
                    }
                },
            }
        );
    }

    private watch(): void {
        if (this.watchCount === 0) {
            this.port.postMessage({
                type: "watch",
            });
        }
        this.watchCount++;
    }

    private unwatch(): void {
        this.watchCount--;
        if (this.watchCount === 0) {
            this.port.postMessage({
                type: "unwatch",
            });
        }
    }

    public leave(): void {
        if (this.left) {
            throw new Error("You have already left this space.");
        }
        this.left = true;
        this.port.postMessage({
            type: "leave",
        });
        this.messagesSubscription.unsubscribe();
        this.port.close();
    }

    public startStreaming(): void {
        this.port.postMessage({
            type: "startStreaming",
        });
    }

    public stopStreaming(): void {
        this.port.postMessage({
            type: "stopStreaming",
        });
    }
}
