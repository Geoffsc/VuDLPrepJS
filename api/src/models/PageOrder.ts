import glob = require("glob");
import path = require("path");

import Job from "./Job";
import { Page, PageRaw } from "./Page";

class PageOrder {
    pages: Array<Page> = [];

    constructor(pages: Array<Page>) {
        this.pages = pages;
    }

    static fromJob(job: Job): PageOrder {
        let pattern = job.dir + "/*.TI{F,FF}";
        const options: Record<string, unknown> = { nocase: true };
        // Special case for Windows -- we need to account for drive letters:
        const colonIndex = pattern.indexOf(":");
        if (colonIndex > -1) {
            options.root = pattern.substring(0, colonIndex + 2);
            pattern = pattern.substring(colonIndex + 1);
        }
        const files = glob.sync(pattern, options);
        const pages = files.map((file) => {
            return new Page(path.basename(file), null);
        });
        return new PageOrder(pages);
    }

    static fromRaw(raw: Array<PageRaw>): PageOrder {
        const pages = raw.map(function (page: PageRaw) {
            return Page.fromRaw(page);
        });
        return new PageOrder(pages);
    }

    get raw(): Array<PageRaw> {
        return this.pages.map(function (page: Page) {
            return page.raw();
        });
    }
}

export default PageOrder;
