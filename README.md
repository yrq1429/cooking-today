# 开火日记

Taro 4 + React + TypeScript 微信小程序。找菜谱、九图拍照记一餐、私人日记时间流。

## 菜谱已改为在线接口

首页搜索与详情使用悦耳菜谱 API，经服务端代理请求。没有本地菜谱兜底；网络或服务失败会明确提示并提供重试，不再静默展示14道旧菜谱。

搜索结果优先保留：至少3项食材、至少3步做法、大部分食材有用量、每个步骤有HTTPS图片。供应商响应只做服务端/会话内15分钟缓存，不把搜索结果导入小程序静态菜谱库。图片当前源分辨率200×200，界面不会伪造高清或补步骤图。

## 本机预览

```sh
cd miniprogram
npm ci
npm run preview
```

访问 http://127.0.0.1:4186 。预览直接运行相同页面组件，通过 `/api/recipes` 请求真实接口；没有注入本地菜谱或模拟接口响应。浏览器相册和本地存储只是方便页面检查的桥接，不能代替微信端权限和文件持久化验证。

密钥读取优先级：服务端进程环境变量 `RECIPE_API_KEY`，其次仓库根目录被Git忽略的 `.env.local`。密钥不进入前端构建或浏览器请求。

## 微信开发与正式发布

```sh
# 保持上面的预览代理运行，再启动微信开发构建
npm run dev:weapp
```

微信开发者工具导入仓库根目录（`project.config.json` 指向 `miniprogram/dist/`）。开发构建默认访问本机 `http://127.0.0.1:4186`；手机真机不应使用这个回环地址。如已有自己的HTTPS代理，可通过环境变量 `RECIPE_API_BASE` 指定服务地址，并配置微信合法请求域名。

本机一次性编译可用 `npm run build:weapp:dev`，它与正式构建分开，避免误把未配置的云函数版本用于本机调试。

默认正式构建改走微信云函数：

1. 在微信开发者工具选择已有云开发环境，上传部署 `cloudfunctions/recipes`。
2. 在云函数服务端配置 `RECIPE_API_KEY` 环境变量，超时设置为30秒。
3. 体验版默认云环境已配置为 `cloud1-d8g1vtmlr4b198fbc`，部署到这个环境后执行 `npm run build:weapp`。如需换环境，可用 `RECIPE_CLOUD_ENV=新的真实环境ID npm run build:weapp` 覆盖。环境ID不是菜谱API密钥。

生产页面通过 `Taro.cloud.callFunction({name:'recipes'})` 调用同一代理逻辑。当前仓库提供了云函数代码，未配置环境ID时不会盲调默认云环境。**本机预览可用不等于云函数已经部署**。云函数无需第三方依赖，不能将密钥粘进小程序配置。

图片直接使用供应商的HTTPS域名 `caipu.ip13.com`；正式版需要核对微信后台相应图片加载/下载域名配置。

## 日记兼容

保留原 `checkins` 存储键、`photo` 字段，新记录新增 `photos` 数组。旧单图日记不迁移、不删除。旧菜谱ID只保留ID到菜名映射，打开时重新查询在线做法；旧正文数据不会用于搜索或详情兜底。

在线日记关联保存 `recipeId` 和 `recipeQuery`，再次进入详情可在缓存失效后重查；所有路由参数在写入前解码。日记与照片依旧保存在本机，没有云端同步。

## 验证

```sh
npm test
npm run typecheck
npm run build:weapp
```

接口核验：`docs/api-evaluation/`；在线页面截图：`docs/preview/online-search.png`、`docs/preview/online-steps.png`。

旧的HowToCook导入数据、脚本和来源文档仅作历史留存，不再作为产品数据源，也不继续扩充。
