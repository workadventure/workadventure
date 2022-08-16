import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { join } from "path";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.GRPC,
        options: {
            // gRPC listens on port 50053
            url: "0.0.0.0:50053",
            package: "workadventure",
            protoPath: join(__dirname, "Messages/protos/messages.proto"),
        },
    });

    await app.startAllMicroservices();
    // HTTP listens on port 3000
    app.enableCors();
    await app.listen(3000);
    console.log(`Application is running on: ${await app.getUrl()}`);
    console.log(`gRPC port is 50053`);
}
bootstrap().catch((e) => console.error(e));
