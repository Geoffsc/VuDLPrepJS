// import { Queue } from 'bullmq';
import { Worker } from "bullmq";

// TODO: Maybe don't load all of them?
import Derivative from "../jobs/Derivative";
import GeneratePdf from "../jobs/GeneratePdf";
import Ingest from "../jobs/Ingest";
import QueueJob from "../jobs/QueueJobInterface";

class JobQueue {
    // TODO: Type
    workers: { [key: string]: QueueJob } = {};
    manager: Worker;

    start(): void {
        // TODO: Maybe don't load all of them?
        this.workers.derivatives = new Derivative();
        this.workers.generatepdf = new GeneratePdf();
        this.workers.ingest = new Ingest();

        this.manager = new Worker("vudl", async (job) => {
            console.log("JOB: " + job.name);
            if (typeof this.workers[job.name] === "undefined") {
                console.error("Unidentified job from queue: " + job.name);
                return;
            }

            return await this.workers[job.name].run(job);
        });

        console.log("JobQueue started");
    }
}

export default JobQueue;
