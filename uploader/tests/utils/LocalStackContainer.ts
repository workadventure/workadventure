import {GenericContainer} from "testcontainers";

export class LocalStackContainer extends GenericContainer {
    constructor() {
        super("localstack/localstack:1.1");
        const portRange = [...Array(4559-4510).keys()].map(i => ({container: 4510+i, host: 4510+i}));
        portRange.push({ container: 4566, host: 4566})
        // eslint-disable-next-line prefer-spread
        this.withExposedPorts.bind(this).apply(null, portRange)
    }
    async run(init: (resolve: (value: unknown) => void, reject: () => void) => void):Promise<void> {
        this.start().then()
        return new Promise((resolve) => {
            const attempt = () => {
                new Promise((resolve, reject) => {
                    init(resolve, reject)
                }).then(() => resolve()).catch(()=> {
                    setTimeout(attempt, 200)
                })
            }
            attempt()
        })
    }
}
