import express = require("express");

import CategoryCollection from "../models/CategoryCollection";
import Category from "../models/Category";
import Config from "../models/Config";
import Job from "../models/Job";

const router = express.Router();
import { setupPassport, requireToken } from "./auth";
import { sanitizeParameters } from "./sanitize";
import fs = require("fs");
setupPassport(router);

function getJobFromRequest(req): Job {
    return fs.existsSync(holdingArea() + req.params.category + "/" + req.params.job)
        ? new Job(holdingArea() + req.params.category + "/" + req.params.job)
        : null;
}

function holdingArea(): string {
    const holdingArea = Config.getInstance().holdingArea;
    return holdingArea.endsWith("/") ? holdingArea : holdingArea + "/";
}

router.get("/", requireToken, function (req, res) {
    const categoryCollection = new CategoryCollection(holdingArea());
    res.json(categoryCollection.raw());
});

router.get("/:category", sanitizeParameters(), requireToken, function (req, res) {
    if (!fs.existsSync(holdingArea() + req.params.category)) {
        return res.status(404).json({ error: "Not Found" });
    }
    const category = new Category(holdingArea() + req.params.category);
    res.json(category.raw());
});

router.get("/:category/:job", sanitizeParameters(), requireToken, function (req, res) {
    const job = getJobFromRequest(req);
    if (job == null) {
        return res.status(404).json({ error: "Job not found" });
    }
    res.json(job.metadata.raw);
});

router.get("/:category/:job/status", sanitizeParameters(), requireToken, function (req, res) {
    const job = getJobFromRequest(req);
    if (job == null) {
        return res.status(404).json({ error: "Job not found" });
    }
    res.json(job.metadata.status);
});

router.put("/:category/:job/derivatives", sanitizeParameters(), requireToken, function (req, res) {
    const job = getJobFromRequest(req);
    if (job == null) {
        return res.status(404).json({ error: "Job not found" });
    }
    job.makeDerivatives();
    res.json({ status: "ok" });
});

router.put("/:category/:job/ingest", sanitizeParameters(), requireToken, function (req, res) {
    const job = getJobFromRequest(req);
    if (job == null) {
        return res.status(404).json({ error: "Job not found" });
    }
    job.ingest();
    res.json({ status: "ok" });
});

router.put("/:category/:job", sanitizeParameters(), requireToken, function (req, res) {
    const job = getJobFromRequest(req);
    const raw = req.body;
    try {
        if (job == null) {
            return res.status(404).json({ error: "Job not found" });
        }
        job.metadata.raw = raw;
        const problems = job.metadata.status.file_problems as Record<string, Array<string>>;
        if (problems.added.length > 0 || problems.deleted.length > 0) {
            throw new Error("file problem found");
        }
        job.metadata.save();
        res.json({ status: "ok" });
    } catch (e) {
        res.status(500).json({ status: "error saving job" });
    }
});

router.get("/:category/:job/:image/:size", sanitizeParameters(), requireToken, async function (req, res) {
    const legalSizes: Record<string, string> = {
        thumb: "THUMBNAIL",
        medium: "MEDIUM",
        large: "LARGE",
    };
    const image: string = req.params.image;
    const size: string = req.params.size;
    const job = getJobFromRequest(req);
    if (job == null) {
        return res.status(404).json({ error: "Job not found" });
    }
    const deriv = await job.getImage(image).derivative(legalSizes[size] ?? "THUMBNAIL");
    res.sendFile(deriv);
});

router.delete(
    "/:category/:job/:image/*",
    router.delete(
        "/:category/:job/:image/*",
        sanitizeParameters({ 0: /^\*$/ }),
        requireToken,
        async function (req, res) {
            const image: string = req.params.image;
            const job = getJobFromRequest(req);
            if (job == null) {
                return res.status(404).json({ error: "Job not found" });
            }
            const imageObj = job.getImage(image);
            if (imageObj !== null) {
                imageObj.delete();
                res.json({ status: "ok" });
            } else {
                res.status(404).json({ status: "image missing" });
            }
        }
    )
);

module.exports = router;
