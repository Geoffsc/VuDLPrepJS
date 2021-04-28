import fs = require("fs");

import AudioOrder from "./AudioOrder";
import DocumentOrder from "./DocumentOrder";
import Job from "./Job";
import { PageRaw } from "./Page";
import PageOrder from "./PageOrder";

interface JobMetadataRaw {
    order: Array<PageRaw>;
    published: boolean;
}

class JobMetadata {
    job: Job;
    _filename: string;
    _order: PageOrder = null;
    _documents: DocumentOrder = null;
    _audio: AudioOrder = null;
    published = false;

    constructor(job: Job) {
        this.job = job;
        this._filename = this.job.dir + "/job.json";
        if (fs.existsSync(this._filename)) {
            const json = fs.readFileSync(this._filename, "utf-8");
            this.raw = JSON.parse(json);
        }
    }

    dc(job: Job): Buffer {
        this.job = job;
        const filename = job.dir + "/dc.xml";
        if (fs.existsSync(filename)) {
            return fs.readFileSync(filename);
        }
    }

    ingestLockfile(): string {
        return this.job.dir + "/ingest.lock";
    }

    get raw(): JobMetadataRaw {
        return {
            order: this.order.raw,
            published: this.published,
        };
    }

    set raw(data: JobMetadataRaw) {
        this._order = PageOrder.fromRaw(data.order);
        this.published = data.published;
    }

    get derivativeLockfile(): string {
        return this.job.dir + "/derivatives.lock";
    }

    get derivativeStatus(): Record<string, unknown> {
        // TODO: populate with real data
        const status = {
            expected: 10,
            processed: 0,
            building: false,
        };
        return status;
    }

    get uploadTime(): number {
        // TODO: populate with real data
        return 0;
    }

    get fileProblems(): Record<string, number> {
        // TODO: populate with real data
        return {
            added: 0,
            deleted: 0,
        };
    }

    get ingestInfo(): string {
        // TODO: populate with real data
        return "";
    }

    get order(): PageOrder {
        if (this._order === null) {
            this._order = PageOrder.fromJob(this.job);
        }
        return this._order;
    }

    set order(order: PageOrder) {
        this._order = PageOrder.fromRaw(data);
    }

    get documents(): DocumentOrder {
        if (this._documents === null) {
            this._documents = DocumentOrder.fromJob(this.job);
        }
        return this._documents;
    }

    set documents(documents: DocumentOrder) {
        this._documents = documents;
    }

    setDocumentsFromRaw(data: Array<string>): void {
        this._documents = DocumentOrder.fromRaw(data);
    }

    get audio(): AudioOrder {
        if (this._audio === null) {
            this._audio = AudioOrder.fromJob(this.job);
        }
        return this._audio;
    }

    set audio(order: AudioOrder) {
        this._audio = order;
    }

    setAudioFromRaw(data: Array<Record<string, string>>): void {
        this._audio = AudioOrder.fromRaw(data);
    }

    save(): void {
        fs.writeFile(this._filename, JSON.stringify(this.raw));
    }

    get status(): Record<string, unknown> {
        return {
            derivatives: this.derivativeStatus,
            // TODO: minutes_since_upload: ((Time.new - upload_time) / 60).floor,
            file_problems: this.fileProblems,
            published: this.raw.published,
            ingesting: fs.existsSync(this.ingestLockfile()),
            documents: this.documents.list.length,
            audio: this.audio.list.length,
            ingest_info: this.ingestInfo,
        };
    }
}

export default JobMetadata;
