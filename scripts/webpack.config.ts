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
      "./images": IMAGES_PATH
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
        test: /\.p?css$/,
        use: [
          'style-loader',
          { loader: 'css-loader', options: { importLoaders: 1 } },
          {
            loader: 'postcss-loader', options: {
              postcssOptions: {
                config: path.resolve(__dirname, 'postcss.config.js'),
              }
            }
          },
        ]
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/inline'
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
