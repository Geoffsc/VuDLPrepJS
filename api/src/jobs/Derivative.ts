const fs = require("fs");

import ImageFile from "../models/ImageFile";
import JobMetadata from "../models/JobMetadata";
import PageOrder from "../models/PageOrder";

// TODO: Abstract Job?
class Derivative {
    async run(job) {
        console.log(": build derivatives: " + job.data.dir);

        // For each page
        const order = PageOrder.fromJob(job.data);
        const generatingPromises = [];
        order.raw.forEach((page) => {
            // For each size
            const image = new ImageFile(`${job.data.dir}/${page.filename}`);
            for (const size in image.sizes) {
                // Check and generate
                const p = image.derivative(size);
                generatingPromises.push(p);
            }
        });

        // Wait for all image generation
        Promise.all(generatingPromises).then(() => {
            // Delete lock file
            try {
                console.log(": build derivatives done");
                const metadata = new JobMetadata(job.data);
                fs.unlinkSync(metadata.derivativeLockfile);
            } catch (e) {
                console.error("lock file not deleted: " + job.data.dir);
            }
        });
    }
}

export default Derivative;
