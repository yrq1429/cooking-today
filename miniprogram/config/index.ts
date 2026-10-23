import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import devConfig from './dev'
import prodConfig from './prod'

export default defineConfig<'webpack5'>(async (merge) => {
  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: 'cooking-today',
    date: '2026-10-23',
    designWidth: 750,
    deviceRatio: { 640: 2.34 / 2, 750: 1, 375: 2, 828: 1.81 / 2 },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: { __RECIPE_CLOUD_ENV__: JSON.stringify(process.env.RECIPE_CLOUD_ENV || ''), __RECIPE_API_BASE__: JSON.stringify(process.env.RECIPE_API_BASE || ''), __RECIPE_USE_HTTP__: JSON.stringify(Boolean(process.env.RECIPE_API_BASE)) },
    copy: { patterns: [{ from: 'src/assets', to: 'dist/assets' }], options: {} },
    framework: 'react',
    compiler: 'webpack5',
    cache: { enable: false },
    mini: {
      postcss: {
        pxtransform: { enable: true, config: {} },
        cssModules: { enable: false }
      }
    },
    h5: {}
  }
  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
})
