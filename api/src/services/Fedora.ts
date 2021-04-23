import { IncomingMessage } from "http";
import Config from '../models/Config';
const http = require("needle");

interface NeedleResponse extends IncomingMessage {
    body: any;
    raw: Buffer;
    bytes: number;
}

interface Attributes {
    [key: string]: string;
}

interface DC {
    name: string;
    value: string;
    attributes: Attributes;
    children: Array<DC>;
}

class Fedora {
    baseUrl: string;
    cache: any = {};

    constructor() {
        let config = Config.getInstance();
        this.baseUrl = config.restBaseUrl();
    }

    /**
     * Make authenticated request to Fedora
     */
    protected _request(
        method: string = "get",
        _path: string = "/",
        data: object = null,
        _options: object = {}
    ): Promise<NeedleResponse> {
        let path = _path[0] == "/" ? _path.slice(1) : _path;
        let url = this.baseUrl + "/" + path;

        // TODO: Config
        const auth = {
            username: "fedoraAdmin", // Basic Auth
            password: "fedoraAdmin",
        };
        let options = Object.assign({}, auth, _options);
        return http(method, url, data, options);
    }

    /**
     * Get RDF about a PID in Fedora
     *
     * @param pid PID to look up
     */
    async getRdf(pid: string, parse = false): Promise<any> {
        if (typeof this.cache[pid] === "undefined") {
            this.cache[pid] = {};
        }
        if (typeof this.cache[pid]["__rdf"] === "undefined") {
            try {
                let res = await this._request(
                    "get",
                    pid,
                    null, // Data
                    { // Options
                        parse_response: parse,
                        headers: { 'Accept' : 'application/rdf+xml' }
                    }
                );

                this.cache[pid]["__rdf"] = parse
                    ? res.body
                    : res.body.toString(); // Buffer to string
            } catch (e) {
                console.log(e);
                throw "RDF retrieval failed for " + pid;
            }
        }
        return this.cache[pid]["__rdf"];
    }

    /**
     * Get datastream from Fedora
     */
    async getDatastream(pid, datastream, parse = false): Promise<any> {
        if (typeof this.cache[pid] === "undefined") {
            this.cache[pid] = {};
        }
        if (typeof this.cache[pid][datastream] === "undefined") {
            try {
                let res = await this._request(
                    "get",
                    pid + "/" + datastream,
                    null, // Data
                    { // Options
                        parse_response: parse,
                    }
                );

                this.cache[pid][datastream] = parse
                    ? res.body
                    : res.body.toString(); // Buffer to string
            } catch (e) {
                console.log("Fedora::getDatastream '" + datastream + "' failed", e);
            }
        }
        return this.cache[pid][datastream];
    }

    /**
     * Get DC datastream from Fedora
     *
     * Cast to DC type
     */
    async getDC(pid): Promise<DC> {
        return <DC> (<unknown> this.getDatastream(pid, "DC", true));
    }
}

export default Fedora;
