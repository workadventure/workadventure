import {GenericContainer} from "testcontainers";
import AWS from "aws-sdk";

export class LocalStackContainer extends GenericContainer {
    constructor() {
        super("localstack/localstack:1.1");
        const portRange = [...Array(4559-4510).keys()].map(i => ({container: 4510+i, host: 4510+i}));
        portRange.push({ container: 4566, host: 4566})
        // eslint-disable-next-line prefer-spread
        this.withExposedPorts.bind(this).apply(null, portRange)
    }
    async run():Promise<void> {
        const access = "mock"
        const secret = "mock"
        AWS.config.update({ accessKeyId: access, secretAccessKey: secret });

        const options = {s3ForcePathStyle: true, endpoint: "http://localhost:4566"};
        const s3 = new AWS.S3(options);
        const check = (resolve: (value: unknown)=>void, reject: ()=>void) => {
            s3.listBuckets( (err: unknown)=>{
                err? reject() : resolve(0)
            })
        }
        this.start().then()
        return new Promise((resolve) => {
            const attempt = () => {
                new Promise((resolve, reject) => {
                    check(resolve, reject)
                }).then(() => resolve()).catch(()=> {
                    setTimeout(attempt, 200)
                })
            }
            attempt()
        })
    }
}
