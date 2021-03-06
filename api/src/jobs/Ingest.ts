import { Job as QueueJob } from "bullmq";
import fs = require("fs");
import path = require("path");
import AudioFile from "../models/AudioFile";
import Category from "../models/Category";
import Config from "../models/Config";
import { DatastreamParameters } from "../services/Fedora";
import { FedoraObject } from "../models/FedoraObject";
import DocumentFile from "../models/DocumentFile";
import ImageFile from "../models/ImageFile";
import Job from "../models/Job";
import Page from "../models/Page";
import QueueJobInterface from "./QueueJobInterface";
import winston = require("winston");
import xmlescape = require("xml-escape");

class IngestProcessor {
    protected job: Job;
    protected category: Category;
    protected logger: winston.Logger;

    constructor(dir: string) {
        this.job = new Job(dir);
        this.category = new Category(path.dirname(dir));
        this.logger = winston.createLogger({
            level: "info",
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
            ),
            transports: [
                new winston.transports.File({ filename: dir + "/ingest.log" }),
                new winston.transports.Console(),
            ],
        });
    }

    async addDatastreamsToPage(page: Page, imageData: FedoraObject): Promise<void> {
        const image = new ImageFile(this.job.dir + "/" + page.filename);
        await imageData.addDatastreamFromFile(image.filename, "MASTER", "image/tiff");
        await imageData.addMasterMetadataDatastream(image.filename);
        for (const size in image.sizes) {
            await imageData.addDatastreamFromFile(await image.derivative(size), size, "image/jpeg");
        }
        if (this.category.supportsOcr) {
            await imageData.addDatastreamFromFile(await image.ocr(), "OCR-DIRTY", "text/plain");
        }
    }

    async addDatastreamsToDocument(document: DocumentFile, documentData: FedoraObject): Promise<void> {
        const pdf = this.job.dir + "/" + document.filename;
        await documentData.addDatastreamFromFile(pdf, "MASTER", "application/pdf");
        await documentData.addMasterMetadataDatastream(pdf);
    }

    async addDatastreamsToAudio(audio: AudioFile, audioData: FedoraObject): Promise<void> {
        this.logger.info("Adding Flac");
        const flac = this.job.dir + "/" + audio.filename;
        await audioData.addDatastreamFromFile(flac, "MASTER", "audio/x-flac");
        this.logger.info("Adding MP3");
        await audioData.addDatastreamFromFile(audio.derivative("MP3"), "MP3", "audio/mpeg");
        this.logger.info("Adding OGG");
        await audioData.addDatastreamFromFile(audio.derivative("OGG"), "OGG", "audio/ogg");
        await audioData.addMasterMetadataDatastream(flac);
    }

    async addPages(pageList: FedoraObject): Promise<void> {
        const order = this.job.metadata.order.pages;
        for (const i in order) {
            const page = order[i];
            const number = parseInt(i) + 1;
            this.logger.info("Adding " + number + " of " + order.length + " - " + page.filename);
            const imageData = await this.buildPage(pageList, page, number);
            await this.addDatastreamsToPage(page, imageData);
        }
    }

    async addDocuments(documentList: FedoraObject): Promise<void> {
        let order = this.job.metadata.documents.list;
        if (order.length == 0 && this.category.supportsPdfGeneration) {
            if (this.job.metadata.order.pages.length < 1) {
                this.logger.info("Skipping PDF generation; no pages found.");
            } else {
                this.logger.info("Generating PDF");
                const pdf = await this.job.generatePdf();
                order = [new DocumentFile(path.basename(pdf), "PDF")];
            }
        }
        for (const i in order) {
            const document = order[i];
            const number = parseInt(i) + 1;
            this.logger.info("Adding " + number + " of " + order.length + " - " + document.filename);
            const data = await this.buildDocument(documentList, document, number);
            await this.addDatastreamsToDocument(document, data);
        }
    }

    async addAudio(audioList: FedoraObject): Promise<void> {
        const order = this.job.metadata.audio.list;
        for (const i in order) {
            const audio = order[i];
            const number = parseInt(i) + 1;
            this.logger.info("Adding " + number + " of " + order.length + " - " + audio.filename);
            const audioData = await this.buildAudio(audioList, audio, number);
            await this.addDatastreamsToAudio(audio, audioData);
        }
    }

    async buildPage(pageList: FedoraObject, page: Page, number: number): Promise<FedoraObject> {
        const imageData = new FedoraObject(await FedoraObject.getNextPid(), this.logger);
        imageData.parentPid = pageList.pid;
        imageData.modelType = "ImageData";
        imageData.title = String(page.label);
        this.logger.info("Creating Image Object " + imageData.pid);

        await imageData.coreIngest("Inactive");
        await imageData.dataIngest();
        await imageData.imageDataIngest();

        await imageData.addSequenceRelationship(pageList.pid, number);

        return imageData;
    }

    async buildPageList(resource: FedoraObject): Promise<FedoraObject> {
        const pageList = new FedoraObject(await FedoraObject.getNextPid(), this.logger);
        pageList.parentPid = resource.pid;
        pageList.modelType = "ListCollection";
        pageList.title = "Page List";
        this.logger.info("Creating Page List Object " + pageList.pid);

        await pageList.coreIngest("Inactive");
        await pageList.collectionIngest();
        await pageList.listCollectionIngest();

        return pageList;
    }

    async buildDocument(documentList: FedoraObject, document: DocumentFile, number: number): Promise<FedoraObject> {
        const documentData = new FedoraObject(await FedoraObject.getNextPid(), this.logger);
        documentData.parentPid = documentList.pid;
        documentData.modelType = "PDFData";
        documentData.title = String(document.label);
        this.logger.info("Creating Document Object " + documentData.pid);

        await documentData.coreIngest("Inactive");
        await documentData.dataIngest();
        await documentData.documentDataIngest();

        await documentData.addSequenceRelationship(documentList.pid, number);

        return documentData;
    }

    async buildDocumentList(resource: FedoraObject): Promise<FedoraObject> {
        const documentList = new FedoraObject(await FedoraObject.getNextPid(), this.logger);
        documentList.parentPid = resource.pid;
        documentList.modelType = "ListCollection";
        documentList.title = "Document List";
        this.logger.info("Creating Document List Object " + documentList.pid);

        await documentList.coreIngest("Inactive");
        await documentList.collectionIngest();
        await documentList.listCollectionIngest();

        return documentList;
    }

    async buildAudio(audioList: FedoraObject, audio: AudioFile, number: number): Promise<FedoraObject> {
        const audioData = new FedoraObject(await FedoraObject.getNextPid(), this.logger);
        audioData.parentPid = audioList.pid;
        audioData.modelType = "AudioData";
        audioData.title = String(audio.filename);
        this.logger.info("Creating Audio Object " + audioData.pid);

        await audioData.coreIngest("Inactive");
        await audioData.dataIngest();
        await audioData.audioDataIngest();

        await audioData.addSequenceRelationship(audioList.pid, number);

        return audioData;
    }

    async buildAudioList(resource: FedoraObject): Promise<FedoraObject> {
        const audioList = new FedoraObject(await FedoraObject.getNextPid(), this.logger);
        audioList.parentPid = resource.pid;
        audioList.modelType = "ListCollection";
        audioList.title = "Audio List";
        this.logger.info("Creating Audio List Object " + audioList.pid);

        await audioList.coreIngest("Inactive");
        await audioList.collectionIngest();
        await audioList.listCollectionIngest();

        return audioList;
    }

    async buildResource(holdingArea: FedoraObject): Promise<FedoraObject> {
        const resource = new FedoraObject(await FedoraObject.getNextPid(), this.logger);
        resource.parentPid = holdingArea.pid;
        resource.modelType = "ResourceCollection";
        resource.title = "Incomplete... / Processing...";
        this.logger.info("Creating Resource Object " + resource.pid);

        await resource.coreIngest("Inactive");
        await resource.collectionIngest();
        await resource.resourceCollectionIngest();

        // Attach thumbnail to resource:
        if (this.job.metadata.order.pages.length > 0) {
            const page = this.job.metadata.order.pages[0];
            const image = new ImageFile(this.job.dir + "/" + page.filename);
            await resource.addDatastreamFromFile(await image.derivative("THUMBNAIL"), "THUMBNAIL", "image/jpeg");
        }
        return resource;
    }

    async finalizeTitle(resource: FedoraObject): Promise<void> {
        const title = this.job.dir.substr(1).split("/").reverse().join("_");
        this.logger.info("Updating title to " + title);
        await resource.modifyObjectLabel(title);

        const dc = await resource.getDatastream("DC");
        const escapedTitle = xmlescape(title);
        const newDublinCore = dc.replace(/Incomplete... \/ Processing.../, escapedTitle);
        if (newDublinCore.indexOf(escapedTitle) < 0) {
            throw new Error("Problem updating Dublin Core title!");
        }
        await this.replaceDCMetadata(resource, newDublinCore, "Set dc:title to ingest/process path");
    }

    async replaceDCMetadata(resource: FedoraObject, dc: string, message: string): Promise<void> {
        this.logger.info(message);
        const params: DatastreamParameters = {
            mimeType: "text/xml",
            logMessage: message,
        };
        await resource.modifyDatastream("DC", params, dc);
    }

    moveDirectory(): void {
        const basePath = Config.getInstance().processedAreaPath;
        const currentTime = new Date();
        const now = currentTime.toISOString().substr(0, 10);
        let target = basePath + "/" + now + "/" + this.category.name + "/" + this.job.name;
        if (fs.existsSync(target)) {
            let i = 2;
            while (fs.existsSync(target + "." + i)) {
                i++;
            }
            target = target + "." + i;
        }
        this.logger.info("Moving " + this.job.dir + " to " + target);
        // TODO: move the directory and clean up (original Ruby below):
        //FileUtils.mkdir_p target unless File.exist?(target)
        //FileUtils.mv Dir.glob("#{@job.dir}/*"), target
        //FileUtils.rmdir @job.dir
        //FileUtils.rm "#{target}/ingest.lock"
    }

    async doIngest(): Promise<void> {
        const startTime = Date.now();
        this.logger.info("Beginning ingest.");
        this.logger.info("Target collection ID: " + this.category.targetCollectionId);
        const holdingArea = new FedoraObject(this.category.targetCollectionId, this.logger);
        if (holdingArea.sort == "custom") {
            // This was already a TODO in the Ruby code; low priority:
            throw new Error("TODO: implement custom sort support.");
        }

        const resource = await this.buildResource(holdingArea);

        // TODO: deal with ordered collection sequence numbers, if needed
        // (this was already a TODO in the Ruby code; low priority)

        if (this.job.metadata.order.pages.length > 0) {
            await this.addPages(await this.buildPageList(resource));
        }

        if (this.job.metadata.documents.list.length > 0 || this.category.supportsPdfGeneration) {
            await this.addDocuments(await this.buildDocumentList(resource));
        }

        if (this.job.metadata.audio.list.length > 0) {
            await this.addAudio(await this.buildAudioList(resource));
        }

        await this.finalizeTitle(resource);
        if (this.job.metadata.dc.length > 0) {
            this.replaceDCMetadata(resource, this.job.metadata.dc, "Loading DC XML");
        }

        this.moveDirectory();

        const elapsed = (Date.now() - startTime) / 60000;
        this.logger.info("Done. Total time: " + elapsed + " minute(s).");
    }

    async run(): Promise<void> {
        try {
            await this.doIngest();
        } catch (e) {
            console.trace(e.message);
            this.logger.error("Unexpected problem: " + e.message);
        }
        this.logger.close(); // Release file handle on log.
    }
}

class Ingest implements QueueJobInterface {
    async run(job: QueueJob): Promise<void> {
        const handler = new IngestProcessor(job.data.dir);
        await handler.run();
    }
}

export default Ingest;
