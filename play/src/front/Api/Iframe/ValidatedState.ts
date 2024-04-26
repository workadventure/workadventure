import {z, ZodObject} from "zod";
import type {ZodRawShape} from "zod/lib/types";
import {Observable, Subject} from "rxjs";
import {map} from "rxjs/operators";
import {WorkadventureStateCommands} from "./state";

export class WorkadventureValidatedStateCommands<T extends ZodObject<ZodRawShape>> {
    protected variableSubscribers = new Map<string, Subject<unknown>>();

    constructor(private state: WorkadventureStateCommands, private zodObject: T) {
    }

    public loadVariable<K extends keyof z.infer<T>>(key: K): z.infer<T>[K] {
        const value = this.state.loadVariable(key as string);
        return this.zodObject.pick({[key as string]: true}).parse({[key]: value})[key];
    }

    public hasVariable(key: string): boolean {
        return this.state.hasVariable(key);
    }

    public onVariableChange(key: string): Observable<unknown> {
        return this.state.onVariableChange(key).pipe(map((value) => {
            const validatedValue = this.zodObject.pick({[key]: true}).parse({[key]: value});
            return validatedValue[key];
        }));
    }

    public async saveVariable<K extends keyof z.infer<T>>(key: K, value: z.infer<T>[K]): Promise<void> {
        //const zodForValue = this.zodObject.shape[key];
        const validatedValue = this.zodObject.pick({[key as string]: true}).parse({[key]: value});

        await this.state.saveVariable(key as string, validatedValue);
    }
}


export function createTypedState<T extends ZodObject<ZodRawShape>>(state: WorkadventureValidatedStateCommands<T>): WorkadventureValidatedStateCommands<T> & z.infer<T> {
    return new Proxy(state, {
        get(target: WorkadventureValidatedStateCommands<T>, p: PropertyKey, receiver: unknown): unknown {
            if (p in target) {
                return Reflect.get(target, p, receiver);
            }
            return target.loadVariable(p.toString());
        },
        set(target: WorkadventureValidatedStateCommands<T>, p: PropertyKey, value: unknown, receiver: unknown): boolean {
            // Note: when using "set", there is no way to wait, so we ignore the return of the promise.
            // User must use WA.state.saveVariable to have error message.
            target.saveVariable(p.toString(), value).catch((e) => console.error(e));
            return true;
        },
        has(target: WorkadventureValidatedStateCommands<T>, p: PropertyKey): boolean {
            if (p in target) {
                return true;
            }
            return target.hasVariable(p.toString());
        },
    }) as WorkadventureValidatedStateCommands<T> & z.infer<T>;
}



const test = new WorkadventureValidatedStateCommands(new WorkadventureStateCommands(), z.object({
    test: z.string(),
}));


test.saveVariable("test2", 12).catch(console.error);
const coucou: number = test.loadVariable("test");
console.log(coucou);


const proxy = createTypedState(test);
proxy.test = 12;
proxy.
proxy.saveVariable("test", 12).catch(console.error);
