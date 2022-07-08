import { default as devConfig } from "./scripts/webpack.development";
import { default as prodConfig } from "./scripts/webpack.production";

let config = devConfig
if (process.env.NODE_ENV === "production") {
  config = prodConfig;
}

export default config;
