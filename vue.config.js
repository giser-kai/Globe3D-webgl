
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const path = require('path')
module.exports = {
  productionSourceMap: false,
  lintOnSave: false,
  publicPath: '',
  outputDir: `dist`,
  pluginOptions: {
    'style-resources-loader': {
      preProcessor: 'less',
      patterns: [
        path.resolve(__dirname, 'src/assets/styles/index.less')
      ]
    }
  },
}
