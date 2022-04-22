import { VariablesRepositoryInterface } from "./VariablesRepositoryInterface";

/**
 * Mock class in charge of NOT saving/loading variables from the data store
 */
export class VoidVariablesRepository implements VariablesRepositoryInterface {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loadVariables(roomUrl: string): Promise<{ [key: string]: string }> {
        return Promise.resolve({});
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    saveVariable(roomUrl: string, key: string, value: string): Promise<number> {
        return Promise.resolve(0);
    }
}
