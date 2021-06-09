import fs = require("fs");
import path = require("path");
import Config from "./Config";
import { execSync } from "child_process";

class AudioFile {
    filename: string;
    extensions: Array<string> = ["OGG", "MP3"];
    dir: string;

    constructor(filename: string, dir: string) {
        this.filename = filename;
        this.dir = dir;
    }

    derivative(extension: string): string {
        const deriv = this.derivativePath(extension);
        if (!fs.existsSync(deriv)) {
            const dir = path.dirname(deriv);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            if (this.extensions.includes(extension)) {
                const ffmpeg_path = Config.getInstance().ffmpegPath;
                if (ffmpeg_path) {
                    const ffmpegCommand = ffmpeg_path + " -i " + this.dir + "/" + this.filename + " " + deriv;
                    execSync(ffmpegCommand);
                    if (!fs.existsSync(deriv)) {
                        throw "Problem generating " + deriv + " with " + ffmpeg_path;
                    }
                } else {
                    throw "ffmpeg not configured";
                }
            }
        }
        return deriv;
    }

    static fromRaw(raw: Record<string, string>): AudioFile {
        return new AudioFile(raw.filename, raw.label);
    }

    raw(): Record<string, string> {
        return { filename: this.filename };
    }

    derivativePath(extension = "flac"): string {
        const ext = this.filename.substr(this.filename.lastIndexOf("."));
        const filename = path.basename(this.filename, ext);
        return this.dir + "/" + filename + "." + extension.toLowerCase();
    }
}

export default AudioFile;
