import fs = require("fs");
import winston = require("winston");
import Config from "./Config";
import { DatastreamParameters, Fedora } from "../services/Fedora";
import { execSync } from "child_process";
import { getNextPid } from "../services/Database";

export interface ObjectParameters {
    label?: string;
    format?: string;
    encoding?: string;
    namespace?: string;
    ownerId?: string;
    logMessage?: string;
    ignoreMime?: boolean;
    lastModifiedDate?: string;
    state?: string;
}

export class FedoraObject {
    public modelType: string;
    public pid: string;
    public parentPid: string;
    public title: string;
    protected fedora: Fedora;
    protected logger: winston.Logger;

    constructor(pid: string, logger: winston.Logger = null) {
        this.pid = pid;
        this.fedora = new Fedora();
        this.logger = logger;
    }

    static async getNextPid(): Promise<string> {
        return getNextPid(Config.getInstance().pidNamespace);
    }

    get namespace(): string {
        return Config.getInstance().pidNamespace;
    }

    async addDatastream(id: string, params: DatastreamParameters, data: string | Buffer): Promise<void> {
        this.log(
            params.logMessage ?? "Adding datastream " + id + " to " + this.pid + " with " + data.length + " bytes"
        );
        await this.fedora.addDatastream(this.pid, id, params, data);
    }

    async addDatastreamFromFile(filename: string, stream: string, mimeType: string): Promise<void> {
        await this.addDatastreamFromStringOrBuffer(fs.readFileSync(filename), stream, mimeType);
    }

    async addDatastreamFromStringOrBuffer(contents: string | Buffer, stream: string, mimeType: string): Promise<void> {
        if (mimeType === "text/plain" && contents.length === 0) {
            contents = "\n"; // workaround for 500 error on empty OCR
        }
        const params: DatastreamParameters = {
            mimeType: mimeType,
            logMessage: "Initial Ingest addDatastream - " + stream,
        };
        await this.addDatastream(stream, params, contents);
    }

    async addMasterMetadataDatastream(filename: string): Promise<void> {
        const params = {
            mimeType: "text/xml",
            logMessage: "Initial Ingest addDatastream - MASTER-MD",
        };
        const fitsXml = this.fitsMasterMetadata(filename);
        await this.addDatastream("MASTER-MD", params, fitsXml);
    }

    async addRelationship(subject: string, predicate: string, obj: string, isLiteral = false): Promise<void> {
        this.log("Adding relationship " + [subject, predicate, obj].join(" ") + " to " + this.pid);
        return this.fedora.addRelsExtRelationship(this.pid, subject, predicate, obj, isLiteral);
    }

    async addModelRelationship(model: string): Promise<void> {
        return this.addRelationship(
            "info:fedora/" + this.pid,
            "info:fedora/fedora-system:def/model#hasModel",
            "info:fedora/vudl-system:" + model
        );
    }

    async addSequenceRelationship(parentPid: string, position: number): Promise<void> {
        return this.addRelationship(
            "info:fedora/" + this.pid,
            "http://vudl.org/relationships#sequence",
            parentPid + "#" + position,
            true
        );
    }

    async addSortRelationship(sort: string): Promise<void> {
        return this.addRelationship("info:fedora/" + this.pid, "http://vudl.org/relationships#sortOn", sort, true);
    }

    async collectionIngest(): Promise<void> {
        this.log("Collection ingest for " + this.pid);
        return this.addModelRelationship("CollectionModel");
    }

    async coreIngest(objectState: string): Promise<void> {
        this.log("Core ingest for " + this.pid);
        await this.fedora.createContainer(this.pid, this.title, objectState, "diglibEditor");
        await this.addModelRelationship("CoreModel");
        return this.addRelationship(
            "info:fedora/" + this.pid,
            "info:fedora/fedora-system:def/relations-external#isMemberOf",
            "info:fedora/" + this.parentPid
        );
    }

    async dataIngest(): Promise<void> {
        await this.addModelRelationship("DataModel");
    }

    async getDatastream(datastream: string): Promise<string> {
        return this.fedora.getDatastreamAsString(this.pid, datastream);
    }

    fitsMasterMetadata(filename: string): string {
        const fitsCommand = Config.getInstance().fitsCommand + " -i " + filename;
        return execSync(fitsCommand).toString();
    }

    async imageDataIngest(): Promise<void> {
        return this.addModelRelationship("ImageData");
    }

    async documentDataIngest(): Promise<void> {
        return this.addModelRelationship("PDFData");
    }

    async audioDataIngest(): Promise<void> {
        return this.addModelRelationship("AudioData");
    }

    async listCollectionIngest(): Promise<void> {
        await this.addModelRelationship("ListCollection");
        return this.addSortRelationship("custom");
    }

    async modifyDatastream(id: string, params: DatastreamParameters, data: string): Promise<void> {
        if (typeof params.dsLabel !== "undefined" || typeof params.dsState !== "undefined") {
            throw new Error("Unsupported parameter(s) passed to modifyDatastream()");
        }
        this.log(params.logMessage);
        await this.fedora.putDatastream(this.pid, id, params.mimeType, 204, data);
    }

    async modifyObjectLabel(title: string): Promise<void> {
        await this.fedora.modifyObjectLabel(this.pid, title);
    }

    async resourceCollectionIngest(): Promise<void> {
        this.log("Resource collection ingest for " + this.pid);
        await this.addModelRelationship("ResourceCollection");
        return this.addSortRelationship("title");
    }

    log(message: string): void {
        if (this.logger) {
            this.logger.info(message);
        }
    }

    get sort(): string {
        // TODO: fetch sort value from RELS-EXT or equivalent, instead of hard-coding
        return "title";
    }
}
