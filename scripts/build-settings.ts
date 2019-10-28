import moment from "moment";

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

export const generateHeader = () => ({
    "id": "ingress-intel-total-conversion@jonatkins",
    "name": "IITC: Ingress intel map total conversion",
    "run-at": "document-end",
    "include": "https://intel.ingress.com/*",
    "match": "https://intel.ingress.com/*",
    "grant": "unsafeWindow",
    "version": `0.29.1.${getBuildNumber()}`,
    "description": `[${environment.BUILD_NAME}-${environment.BUILD_DATE}] Total conversion for the ingress intel map.`,
});
