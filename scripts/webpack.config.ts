import path from "path";
import webpack from "webpack";
import WebpackUserscript from "webpack-userscript";
import { environment, generateHeader } from "./build-settings";
import { DIST_PATH, EXTERNAL_PATH, IMAGES_PATH, SRC_PATH } from "./paths";

const config: webpack.Configuration = {
  entry: "./core/total-conversion-build.js",
  output: {
    path: DIST_PATH,
    filename: "total-conversion-build.user.js",
  },
  resolve: {
    alias: {
      "jquery-ui-static": path.join(__dirname, "node_modules", "jquery-ui"),
      "./images": IMAGES_PATH,
    },
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        include: [SRC_PATH],
        exclude: [/node_modules/, EXTERNAL_PATH],
      },
      {
        test: /\.css?$/,
        loader: "css-loader",
        include: [EXTERNAL_PATH],
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        loader: "url-loader",
        include: [IMAGES_PATH],
        options: {
          limit: true,
        },
      },
    ],
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      ...environment,
    }),
    new webpack.ProvidePlugin({
      "$": "jquery",
      "jQuery": "jquery",
      "window.jQuery": "jquery",
    }),
    new WebpackUserscript({
      headers: generateHeader,
    }),
  ],
};

export default config;
