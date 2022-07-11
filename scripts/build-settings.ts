import moment from "moment";
import { HeaderObject } from "webpack-userscript";

const getBuildDate = () => {
    return moment().utc().format("YYYY-MM-DD-HHmmSS");
};

const getBuildNumber = () => {
    return moment().utc().format("YYYYMMDD.HmmSS");
};

export const environment = {
    BUILD_NAME: process.env.NODE_ENV === "production" ? "release" : "local",
    BUILD_DATE: getBuildDate(),
};

export const generateHeader = (): HeaderObject => ({
    "id": "ingress-intel-total-conversion@jonatkins",
    "name": "IITC: Ingress intel map total conversion",
    "run-at": "document-end",
    "include": "https://intel.ingress.com/*",
    "match": "https://intel.ingress.com/*",
    "grant": "none",
    "version": `1.0.0.${getBuildNumber()}`,
    "description": `[${environment.BUILD_NAME}-${environment.BUILD_DATE}] Total conversion for the ingress intel map.`,
});
