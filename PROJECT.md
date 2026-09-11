# Arcade Vault 项目上下文

## 项目定位

Arcade Vault 是一个纯前端网页街机厅。浏览器通过 EmulatorJS 4.2.3 的 FBNeo WebAssembly 核心运行用户自行提供的街机 ROM，当前覆盖 Neo Geo（拳皇系列）和 IGS PGM（三国战纪系列）。运行时没有业务后端，存档保存在浏览器本地。

## 技术栈

- 原生 HTML、CSS、ES Modules
- EmulatorJS 4.2.3 + FBNeo WebAssembly 核心（含独立 `kovplus2007` 驱动）
- IndexedDB：项目侧的即时存档、原生存档备份与游玩记录
- EmulatorJS 浏览器缓存：模拟器自动保存的 NVRAM/存档槽
- Node.js 内置测试运行器与静态开发服务器
- nginx 静态托管，Docker 目录只读挂载 ROM、BIOS 和封面

## 代码定位

| 位置 | 职责 |
| --- | --- |
| `index.html`、`assets/app.js` | 游戏大厅、筛选、资源可用性检测 |
| `assets/game-presentation.js` | 卡片版本标签与左侧街机屏幕预览文本 |
| `play.html`、`assets/player.js`、`assets/player-layout.js` | 模拟器装载、继续游戏、运行状态提示及桌面工具栏宽度 |
| `assets/move-lists.js`、`assets/move-list-panel.js` | 分游戏维护出招数据，并提供人物与招式搜索面板 |
| `assets/catalog.js` | 独立游戏目录发现、资源角色校验与安全 URL 生成 |
| `assets/theme.js` | 默认亮色、暗亮切换与本地偏好保存 |
| `assets/storage.js` | 可替换的存档仓库接口及 IndexedDB 实现 |
| `scripts/prepare-emulator.mjs` | 生成浏览器运行包，并优先装配项目内定制 FBNeo 核心 |
| `vendor/core-fbneo/` | 随部署分发的四套定制 FBNeo 核心与构建报告 |
| `patches/fbneo-kovplus2007.patch` | `kovplus2007` 独立驱动源码补丁，不覆盖上游 `kovplus` |
| `docs/custom-fbneo-core.md` | 定制核心固定版本、ROM 约定与重建说明 |
| `docs/docker-runtime-troubleshooting.md` | 构建在 `RUN` 步骤抛出 Go panic 时，区分服务器容器运行时故障与项目故障 |
| `nginx.conf` | 静态资源缓存、WASM MIME 与跨源隔离响应头 |
| `deploy.sh` | 参考同级 `game` 项目的服务器镜像构建与容器替换流程，构建前先探活容器运行时 |

## 不可破坏的边界

1. ROM、BIOS、商业游戏封面不得提交到仓库，必须放在被忽略的 `runtime/游戏名称/` 下或由部署目录映射。
2. 自动发现的资源路径必须是站点内相对路径，禁止远程 URL 和 `..` 路径跳转。
3. 游戏 ID 一经上线不可修改；它是浏览器存档的命名空间。
4. FBNeo 核心版本与 ROM set 必须匹配。升级 npm 核心或替换 `vendor/core-fbneo/` 时必须同时回归原版 `kovplus` 与定制 `kovplus2007`。
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
- 三国战纪 2007 快速集气版是例外：定制驱动短名称固定为 `kovplus2007`，主 ZIP 内程序固定为 `p0600.119`（CRC32 `b2ee0885`），并使用合并包携带公共 ROM，所以无需 `parents/kovplus.zip`，也不得改回上游 `kovplus` 短名称。
- nginx 的 `/runtime/` JSON 目录索引是自动发现入口；外层代理不得拦截或改写其各级目录请求。
- 大厅清单保存在 localStorage，首扫按游戏并行；之后只轮询根目录并增量扫描新增项。游戏页应复用缓存或通过 `folder` 参数只扫描目标目录，不能重新扫描整个 runtime。
- Docker bind mount 能立即看到挂载目录内部的变化，但看不到宿主机将挂载根目录整体删除后重建；上传资源只能修改根目录内部内容。
- 服务器容器运行时（runc 的 prestart hook）坏掉时，构建会在第一个 `RUN` 步骤失败，报错全是 hook 进程的 Go 堆栈（`error running prestart hook #0`、`name offset out of range`），与仓库无关。更麻烦的是 `RUN` 步骤命中 Docker 层缓存时构建根本不起容器，故障能静默存在很久，只有改动 `package.json`、锁文件或 `scripts/` 的那次提交才撞得上。`deploy.sh` 已加构建前的运行时探活；没有普通镜像标签时必须拉取轻量镜像继续探活，不能跳过，排查步骤见 `docs/docker-runtime-troubleshooting.md`。
- `deploy.sh` 默认挂载 `/app/arcade-games/arcade-games-data`；Docker Compose 默认挂载仓库 `runtime`，服务器使用 Compose 时必须通过 `ARCADE_DATA_DIR` 指向实际上传目录。
- 每个游戏目录的 `roms/`、`bios/`、`parents/` 都至多放一个 ZIP；只有主 ROM 放在 `roms/`，否则无法可靠判断资源角色。
- EmulatorJS 调试模式会跳过已经写入 IndexedDB 的 ROM 缓存；不得重新启用 `EJS_DEBUG_XX`。
- 浏览器隐私模式、清理站点数据或更换域名会让本地存档不可见；重要存档应在模拟器菜单中导出备份。
- 页面展示的键位必须同步维护在 `assets/controls.js`；EmulatorJS 自带默认键位不是 WASD，并且用户保存过的自定义键位会优先于项目默认值。
- 出招表使用街机 A/B/C/D 记法，页面必须同时说明本站 J/K/U/I 的对应关系；新增游戏时在 `assets/move-lists.js` 按游戏 ID 独立登记，不能让版本不明的招式污染其它游戏。
- PC 出招表属于右侧工具栏内容，不能覆盖模拟器；默认宽度需至少完整显示一名人物的招式，工具栏拖宽后出招卡片自动切换为双列。EmulatorJS 仍保持画面比例，先减少黑色留白、空间不足后再等比缩小。移动端才把同一份出招表节点移入模态弹窗。
- EmulatorJS 4.2.3 只在模拟器内部容器监听键盘；`assets/controls.js` 的页面级桥接负责处理焦点落在侧栏或已关闭菜单按钮上的情况，并保证短按至少维持数帧，升级依赖时需回归这条路径。
- EmulatorJS 4.2.3 默认解压 BIOS/父 ROM，但 FBNeo 按 ZIP romset 名称查找它们；游戏页必须保持 `EJS_dontExtractBIOS = true`，并把各游戏目录中的完整资源 URL 传给模拟器。
- EmulatorJS 4.2.3 在 `dontExtractBIOS` 模式下会错误地用完整 URL 写入虚拟文件系统；`prepare-emulator.mjs` 会将其修补为 ZIP 文件名。升级依赖后如果上游逻辑变化，准备脚本必须明确失败，不能静默跳过。
- `prepare-emulator.mjs` 发现 `vendor/core-fbneo/` 时必须完整拿到普通、legacy、thread、thread-legacy 四个核心；缺一套就明确失败，不能静默退回 npm 原版导致 `kovplus2007` 在线上变成未知 ROM。
- nginx 会长期缓存 EmulatorJS 文件；替换定制核心时必须同步修改 `assets/resource-cache.js` 的 `EMULATOR_ASSET_REVISION`，让核心报告、四套核心和加载脚本一起换 URL，否则浏览器会继续使用旧核心并提示 `Romset is unknown`。
- 这个版本的 FBNeo Web 核心首次 `callMain` 后可能停在黑屏，`EJS_softLoad = 1` 用一次性延迟重置进入主板启动画面。
