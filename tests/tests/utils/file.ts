import fs from 'fs';

export async function createFileOfSize(filePath: string, size: number): Promise<boolean>{
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, Buffer.alloc(size), err => err? reject(err) : resolve(true))
    })
}

export function fileExist(filePath: string){
    return fs.existsSync(filePath);
}

export function deleteFile(filePath: string) {
    fs.rmSync(filePath, {
        force: true,
    });
}