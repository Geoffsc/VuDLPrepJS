import glob = require("glob");
import path = require("path");

import AudioFile from "./AudioFile";
import Job from "./Job";

class AudioOrder {
    list: Array<AudioFile> = [];

    constructor(list: Array<AudioFile>) {
        this.list = list;
    }

    static fromJob(job: Job): AudioOrder {
        const list = glob.sync(job.dir + "/*.flac").map(function (flac: string) {
            return new AudioFile(path.basename(flac), job.dir);
        });
        return new AudioOrder(list);
    }

    static fromRaw(raw: Array<Record<string, string>>): AudioOrder {
        const list = raw.map(function (list) {
            return AudioFile.fromRaw(list);
        });
        return new AudioOrder(list);
    }

    raw(): Array<Record<string, string>> {
        return this.list.map(function (audiofile: AudioFile) {
            return audiofile.raw();
        });
    }
}

export default AudioOrder;
