import postcssPresetEnv from 'postcss-preset-env';
import postcssImport from 'postcss-import';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [postcssImport(), postcssPresetEnv(), autoprefixer()],
};
