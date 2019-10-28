export default () => {
  if (process.env.NODE_ENV !== "production") {
    return import("./scripts/webpack.development");
  }
  return import("./scripts/webpack.production");
};
