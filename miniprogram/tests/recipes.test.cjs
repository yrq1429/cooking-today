const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const recipes = require('../src/data/open-recipes.json')
test('每道精选菜有对应成品封面和完整的用量、步骤、出处', () => {
  assert.ok(recipes.length >= 14)
  for (const r of recipes) {
    assert.ok(fs.existsSync(path.join(__dirname, '../src', r.cover)), r.name)
    assert.ok(r.ingredients.length >= 4, r.name)
    assert.ok(r.steps.length >= 4, r.name)
    assert.ok(r.source.url.startsWith('https://github.com/Anduin2017/HowToCook/blob/'))
    assert.ok(r.steps.every(s => !s.includes('![') && !/^![^\s]+$/.test(s)), r.name + ': no raw markdown images')
  }
})
test('木耳和鲈鱼封面使用成品图，图片总计不超过1.5MB', () => {
  assert.ok(recipes.find(r => r.name === '凉拌木耳').cover.endsWith('-9.jpg'))
  assert.ok(recipes.find(r => r.name === '清蒸鲈鱼').cover.endsWith('-2.jpg'))
  const dir = path.join(__dirname, '../src/assets/recipes')
  assert.ok(fs.readdirSync(dir).reduce((bytes, file) => bytes + fs.statSync(path.join(dir, file)).size, 0) < 1.5 * 1024 * 1024)
})
test('食材清单包含做法中不可缺少的调味与主料', () => {
  for (const [name, required] of [['日式咖喱饭', ['咖喱块','米饭']], ['地三鲜', ['葱','姜','蒜','生抽','糖','豆瓣酱']], ['上汤娃娃菜', ['葱','姜','蒜','蚝油']]]) {
    const r = recipes.find(r => r.name === name)
    for (const ingredient of required) assert.ok(r.ingredients.some(i => i.name.includes(ingredient)), `${name}: ${ingredient}`)
  }
})
