import Page from "./Page";

class PageOrder {
    pages: Array<object> = [];

    constructor(pages) {
        this.pages = pages;
    }

    static fromJob(job) {
        const glob = require("glob");
        let pattern = job.dir + "/*.TI{F,FF}";
        const options: any = { nocase: true };
        // Special case for Windows -- we need to account for drive letters:
        const colonIndex = pattern.indexOf(":");
        if (colonIndex > -1) {
            options.root = pattern.substring(0, colonIndex + 2);
            pattern = pattern.substring(colonIndex + 1);
        }
        const files = glob.sync(pattern, options);
        // TODO: can we rewrite this as a map() for better efficiency?
        const pages = [];
        for (let i = 0; i < files.length; i++) {
            pages[i] = new Page(this.basename(files[i]), null);
        }
        return new PageOrder(pages);
    }

    static fromRaw(raw) {
        const pages = raw.map(function (page: string) {
            return Page.fromRaw(page);
        });
        return new PageOrder(pages);
    }

    get raw() {
        return this.pages.map(function (page: Page) {
            return page.raw();
        });
    }

    static basename(path) {
        return path.replace(/\/$/, "").split("/").reverse()[0];
    }
}

export default PageOrder;
