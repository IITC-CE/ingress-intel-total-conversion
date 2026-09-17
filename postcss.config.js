import postcssPresetEnv from 'postcss-preset-env';
import postcssImport from 'postcss-import';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

export default {
  plugins: [postcssImport(), postcssPresetEnv(), autoprefixer(), cssnano()],
};
