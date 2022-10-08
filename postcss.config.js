module.exports = {
  plugins: [
    require('postcss-import'),
    require('postcss-simple-vars'),
    require('postcss-nested'),
    require('postcss-image-inliner')({
      strict: true,
      assetPaths: [
        './core/', './core/external/',
        './plugins/', './plugins/external'
      ]
    })
  ]
};
