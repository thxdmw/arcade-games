# Arcade Vault 项目上下文

## 项目定位

Arcade Vault 是一个纯前端网页街机厅。浏览器通过 EmulatorJS 4.2.3 的 FBNeo WebAssembly 核心运行用户自行提供的街机 ROM，当前覆盖 Neo Geo（拳皇系列）和 IGS PGM（三国战纪系列）。运行时没有业务后端，存档保存在浏览器本地。

## 技术栈

- 原生 HTML、CSS、ES Modules
- EmulatorJS 4.2.3 + FBNeo WebAssembly 核心
- IndexedDB：项目侧的即时存档、原生存档备份与游玩记录
- EmulatorJS 浏览器缓存：模拟器自动保存的 NVRAM/存档槽
- Node.js 内置测试运行器与静态开发服务器
- nginx 静态托管，Docker 目录只读挂载 ROM、BIOS 和封面

## 代码定位

| 位置 | 职责 |
| --- | --- |
| `index.html`、`assets/app.js` | 游戏大厅、筛选、资源可用性检测 |
| `play.html`、`assets/player.js` | 模拟器装载、继续游戏、运行状态提示 |
| `assets/catalog.js` | 独立游戏目录发现、资源角色校验与安全 URL 生成 |
| `assets/theme.js` | 默认亮色、暗亮切换与本地偏好保存 |
| `assets/storage.js` | 可替换的存档仓库接口及 IndexedDB 实现 |
| `scripts/prepare-emulator.mjs` | 将 npm 中的 EmulatorJS 和 FBNeo 运行资源复制到静态目录 |
| `nginx.conf` | 静态资源缓存、WASM MIME 与跨源隔离响应头 |
| `deploy.sh` | 参考同级 `game` 项目的服务器镜像构建与容器替换流程 |

## 不可破坏的边界

1. ROM、BIOS、商业游戏封面不得提交到仓库，必须放在被忽略的 `runtime/游戏名称/` 下或由部署目录映射。
2. 自动发现的资源路径必须是站点内相对路径，禁止远程 URL 和 `..` 路径跳转。
3. 游戏 ID 一经上线不可修改；它是浏览器存档的命名空间。
4. FBNeo 核心版本与 ROM set 必须匹配。升级 `@emulatorjs/core-fbneo` 时要回归现有 ROM。
5. `SaveRepository` 是后续后端存档的替换点，游戏页不得直接操作 IndexedDB 表结构。

## 验证入口

```bash
npm ci --omit=optional
npm run prepare:emulator
npm test
npm run check
docker build -t arcade-games:test .
```

改动 UI 后还需要运行 `npm run dev`，在真实浏览器中至少验证：首页资源状态、一个 Neo Geo ROM、一个 PGM ROM、即时存档后刷新继续、键盘与手柄。

## 易错点

- 直接双击 HTML 会被浏览器的模块与 WASM 安全策略拦截，必须经 HTTP 服务访问。
- 本地 `5173` 被其它进程占用时开发服务器会自动顺延端口，访问地址以终端实际输出为准。
- 开启 FBNeo 多线程需要 COOP/COEP 响应头；本项目的开发服务器和 nginx 已配置，反向代理不能把这些头删掉。
- Hack/克隆版经常依赖父 ROM，`parentRom` 只是额外传给核心，父、子压缩包都必须与当前 FBNeo romset 版本匹配。
- nginx 的 `/runtime/` JSON 目录索引是自动发现入口；外层代理不得拦截或改写其各级目录请求。
- `deploy.sh` 默认挂载 `/app/arcade-games/arcade-games-data`；Docker Compose 默认挂载仓库 `runtime`，服务器使用 Compose 时必须通过 `ARCADE_DATA_DIR` 指向实际上传目录。
- 每个游戏目录的 `roms/`、`bios/`、`parents/` 都至多放一个 ZIP；只有主 ROM 放在 `roms/`，否则无法可靠判断资源角色。
- EmulatorJS 调试模式会跳过已经写入 IndexedDB 的 ROM 缓存；不得重新启用 `EJS_DEBUG_XX`。
- 浏览器隐私模式、清理站点数据或更换域名会让本地存档不可见；重要存档应在模拟器菜单中导出备份。
- 页面展示的键位必须同步维护在 `assets/controls.js`；EmulatorJS 自带默认键位不是 WASD，并且用户保存过的自定义键位会优先于项目默认值。
- EmulatorJS 4.2.3 只在模拟器内部容器监听键盘；`assets/controls.js` 的页面级桥接负责处理焦点落在侧栏或已关闭菜单按钮上的情况，并保证短按至少维持数帧，升级依赖时需回归这条路径。
- EmulatorJS 4.2.3 默认解压 BIOS/父 ROM，但 FBNeo 按 ZIP romset 名称查找它们；游戏页必须保持 `EJS_dontExtractBIOS = true`，并把各游戏目录中的完整资源 URL 传给模拟器。
- 这个版本的 FBNeo Web 核心首次 `callMain` 后可能停在黑屏，`EJS_softLoad = 1` 用一次性延迟重置进入主板启动画面。
