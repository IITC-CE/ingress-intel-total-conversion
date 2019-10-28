import path from "path";
import { environment } from "./build-settings";

export const ROOT_PATH = path.join(__dirname, "..");
export const SRC_PATH = path.join(ROOT_PATH, "./");
export const EXTERNAL_PATH = path.join(SRC_PATH, "external");
export const IMAGES_PATH = path.join(SRC_PATH, "images");
export const DIST_PATH = path.join(ROOT_PATH, "build", environment.BUILD_NAME);
