import { END_IF_FILE_MSG } from "../Signaling/consts";

export class FileBuilder {

    files: Map<string, Array<ArrayBuffer>>;

    constructor() {
        this.files = new Map<string, Array<ArrayBuffer>>;
    }

    
    assembleFile(name: string, buffer: ArrayBuffer | string) :boolean {
        if(!this.files.has(name)) {
            this.files.set(name, [buffer as ArrayBuffer]);
            return false;
        }
        else {
            const file = this.files.get(name);

            if(buffer !== END_IF_FILE_MSG) {
                file.push(buffer as ArrayBuffer);
                this.files.set(name, file);

                return false;
            } else {
                return true;
            }
        }
    }

    buildFile(name: string): Blob {
        const buffer = this.files.get(name);

        if(!buffer) {
            throw Error("file not existing");
        }
        else {
            const arrayBuffer = buffer.reduce((prev: ArrayBuffer, next: ArrayBuffer) => {
                const tmp = new Uint8Array(prev.byteLength + next.byteLength);
                tmp.set(new Uint8Array(prev), 0);
                tmp.set(new Uint8Array(next), prev.byteLength);
                return tmp;
            }, new Uint8Array());
            const blob = new Blob([arrayBuffer]);
            return blob;
        }
    }
 }