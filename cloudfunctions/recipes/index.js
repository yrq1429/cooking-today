const { createRecipeService } = require('./provider.cjs')
const service = createRecipeService({ getKey: () => process.env.RECIPE_API_KEY })
exports.main = async event => service.handle(event)
