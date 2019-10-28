import merge from "webpack-merge";
import configure from "./webpack.config";

export default merge(configure, {
  mode: "production",
});
