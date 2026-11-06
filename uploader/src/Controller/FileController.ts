import { v4 } from "uuid";
import type { Express } from "express";
import multer from "multer";
import { uploaderService } from "../Service/UploaderService";
import { MAX_UPLOAD_SIZE } from "../Enum/EnvironmentVariable";
import { HttpResponseDevice } from "./HttpResponseDevice";

// Uploaded files are buffered in memory, so an upload must never be allowed to grow unbounded.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
  },
});

export class FileController {
  constructor(private App: Express) {
    this.App = App;

    this.uploadAudioMessage();
    this.downloadAudioMessage();
    this.ping();
  }

  uploadAudioMessage() {
    /*this.App.options("/upload-audio-message", (req: Request, res: Response) => {
            res.status(200).send("");
        });*/

    this.App.post(
      "/upload-audio-message",
      upload.single("file"),
      async (request, response) => {
        if (!request.file) {
          return response.status(400).send("No files were uploaded.");
        }

        const audioMessageId = v4();

        await uploaderService.uploadTempFile(
          audioMessageId,
          request.file.buffer,
          60
        );

        return response.status(200).json({
          id: audioMessageId,
          path: `/download-audio-message/${audioMessageId}`,
        });
      }
    );
  }

  downloadAudioMessage() {
    this.App.get("/download-audio-message/:id", (request, response) => {
      const id = request.params["id"];
      uploaderService
        .getTemp(id)
        .then((buffer) => {
          // Audio messages are played by an <audio> element, they are not downloaded.
          const targetDevice = new HttpResponseDevice(id, response, false);
          return targetDevice.copyFromBuffer(Buffer.from(buffer ?? ""));
        })
        .catch((e) => {
          console.error(e);
          return response.status(500).send("Internal server error");
        });
    });
  }

  ping() {
    this.App.get("/ping", (req, res) => {
      res.status(200).send("pong");
    });
  }
}
