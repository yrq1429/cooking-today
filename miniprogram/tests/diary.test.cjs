const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
require.extensions['.ts'] = (module, file) => module._compile(ts.transpile(require('fs').readFileSync(file, 'utf8'), { module: ts.ModuleKind.CommonJS }), file)
const diary = require('../src/services/diary.ts')

test('旧照片记录和新九图记录都可回看', () => {
  assert.deepEqual(diary.checkinPhotos({ photo: '/old.jpg' }), ['/old.jpg'])
  assert.deepEqual(diary.checkinPhotos({ photo: '/cover.jpg', photos: ['/a.jpg', '/b.jpg'] }), ['/a.jpg', '/b.jpg'])
})
test('时间流按时间降序，月份筛选包括跨年记录且不改变原数组', () => {
  const rows = [{ id: 'a', date: '2025-12-31', createdAt: 1 }, { id: 'b', date: '2026-01-01', createdAt: 2 }]
  assert.deepEqual(diary.diaryMonths(rows), ['2026-01', '2025-12'])
  assert.deepEqual(diary.diaryEntries(rows, '').map(x => x.id), ['b', 'a'])
  assert.deepEqual(diary.diaryEntries(rows, '2025-12').map(x => x.id), ['a'])
  assert.equal(rows[0].id, 'a')
})
test('照片是唯一必填项，允许不写菜名和文字，上限九图', () => {
  assert.equal(diary.validatePost([]), '选几张今天的照片吧')
  assert.equal(diary.validatePost(['/photo']), '')
  assert.equal(diary.validatePost(Array(10).fill('/photo')), '最多选择9张照片')
})
test('多图保存中途失败会清理已保存文件且不产生记录', async () => {
  const removed = []
  await assert.rejects(diary.persistPhotos(['/a', '/b'], async (path) => {
    if (path === '/b') throw new Error('storage full')
    return '/saved-a'
  }, async path => removed.push(path)), /storage full/)
  assert.deepEqual(removed, ['/saved-a'])
})
