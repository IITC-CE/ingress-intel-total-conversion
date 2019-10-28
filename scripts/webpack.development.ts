import { Configuration } from "webpack-dev-server";
import merge from "webpack-merge";

import { DIST_PATH } from "./paths";
import configure from "./webpack.config";

const devServer: Configuration = {
  contentBase: DIST_PATH,
};

export default merge(configure, {
  mode: "development",
  devtool: "source-map",
  devServer,
  watchOptions: {
    poll: 100,
  },
});
