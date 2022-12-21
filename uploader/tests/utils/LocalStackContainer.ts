import {GenericContainer, StartedTestContainer} from "testcontainers";
import AWS from "aws-sdk";
import {AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY} from "../../src/Enum/EnvironmentVariable";

export class LocalStackContainer extends GenericContainer {
    constructor() {
        super("localstack/localstack:1.3.1");
        this.withExposedPorts({ container: 4566, host: 4566})
    }
    async run(): Promise<StartedTestContainer> {
        AWS.config.update({ accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY });

        const options = {s3ForcePathStyle: true, endpoint: "http://localhost:4566"};
        const s3 = new AWS.S3(options);
        const check = (resolve: (value: unknown)=>void, reject: ()=>void) => {
            s3.listBuckets( (err: unknown)=>{
                err? reject() : resolve(0)
            })
        }
        const startPromise = this.start()
        await new Promise((resolve) => {
            const attempt = () => {
                new Promise((resolve, reject) => {
                    check(resolve, reject)
                }).then(() => {
                    //console.log("S3 successfully started");
                    resolve(0)
                }).catch(()=> {
                    setTimeout(attempt, 200)
                })
            }
            attempt()
        })
        return startPromise
    }
}
