export default {
  logger: { quiet: false, stats: true },
  defineConstants: { __RECIPE_API_BASE__: JSON.stringify(process.env.RECIPE_API_BASE || 'http://127.0.0.1:4186'), __RECIPE_USE_HTTP__: 'true' },
  mini: {},
  h5: {}
}
