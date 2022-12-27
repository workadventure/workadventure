import { Request, Response, NextFunction } from "express";
import { mapPath } from "../Services/PathMapper";
import { FileSystemInterface } from "../Upload/FileSystemInterface";

export function proxyFiles(fileSystem: FileSystemInterface) {
    return (req: Request, res: Response, next: NextFunction) => {
        const virtualPath = mapPath(req.path, req);

        fileSystem.serveStaticFile(virtualPath, res, next);
    };
}
