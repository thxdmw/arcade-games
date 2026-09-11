# Arcade Vault

一个可自行部署的纯前端网页街机厅。浏览器使用 FBNeo WebAssembly 核心运行街机 ROM；服务器只负责发送静态文件，不参与模拟、账号或存档。

游戏由 `runtime/` 下的独立目录自动发现，目录名就是页面展示名称。项目不包含可提交的 ROM、BIOS 或商业封面，请只使用你有权使用的资源。

> FBNeo 的原始代码许可限制商业获利，也禁止无合法授权地把模拟器与 ROM 一起分发。公开或商业部署前请阅读 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) 及上游完整许可。

## 快速启动

需要 Node.js 20 或更高版本：

```bash
npm ci --omit=optional
npm run prepare:emulator
npm run dev
```

`prepare:emulator` 不仅复制 FBNeo 核心，还会生成 npm 包中缺失的浏览器运行文件并修正嵌套 `runtime` URL 的压缩包写入路径。项目自带的 `vendor/core-fbneo/` 定制核心会优先于 npm 原版核心，用于识别独立短名称 `kovplus2007`；首次安装依赖或升级 EmulatorJS 后必须重新执行。

终端会输出实际访问地址。默认是 `http://localhost:5173`；如果这个端口已被占用，会自动尝试 `5174`、`5175` 等后续端口。把资源放入以下目录后刷新首页：

```text
runtime/
├── 拳皇97/
│   ├── roms/kof97.zip
│   ├── bios/neogeo.zip
│   └── covers/cover.png
└── 三国战纪/
    ├── roms/kov.zip
    ├── bios/pgm.zip
    └── covers/cover.png
```

每个游戏目录完全独立：`roms/` 必须只有一个主游戏 ZIP；需要父 ROM 时放进 `parents/`；`bios/` 最多一个 BIOS；`covers/` 可放与游戏目录同名、与 ROM 同名或名为 `cover` 的 PNG、WebP、JPG。首次访问会并行扫描目录并缓存清单；以后先显示缓存，只检查一次很小的 `runtime/` 根目录列表。页面每 15 秒检查新增或删除的游戏，也可以点击“刷新”重新扫描。进入游戏页会复用清单缓存或只扫描所选目录，不再扫描全部游戏。FBNeo 对 romset 版本很敏感；压缩包能被下载不代表一定与本项目固定的 FBNeo 4.2.3 核心匹配。

三国战纪 2007 快速集气版使用项目内的独立驱动，不覆盖原版 `kovplus`，也不需要 `game.json`。目录名仍是页面展示名称，主包必须叫 `kovplus2007.zip`，包内修改程序必须叫 `p0600.119`；该包已经合并所需的公共图形和声音 ROM，因此本游戏只需另放 `pgm.zip` BIOS，不要再放 `parents/kovplus.zip`：

```text
runtime/三国战纪_2007快速集气版_修改版/
├── roms/kovplus2007.zip
├── bios/pgm.zip
└── covers/cover.png
```

定制驱动的源码补丁、固定版本和重建说明见 [`docs/custom-fbneo-core.md`](docs/custom-fbneo-core.md)。

首次运行会下载 ROM、父 ROM 和 BIOS，EmulatorJS 随后将它们写入浏览器 IndexedDB；后续进入同一游戏只用 HEAD 检查文件大小，匹配时直接读取本机缓存。清理站点数据或浏览器拒绝持久存储后仍可能重新下载。

首页默认亮色并固定在一个可视窗口内，分类、搜索和刷新集中在与卡片左边缘对齐的顶栏，让右侧内容区直接展示更多卡片。左侧街机会在屏幕中显示当前游戏封面，并支持摇杆换游戏、随机选台、点击屏幕或“开始”进入游戏；卡片底部展示 ROM 短名称、原版/修改版和父 ROM 依赖。右上角可切换暗色，偏好保存在浏览器中。

默认键盘操作为 `WASD` 移动、`JKUI` 四个动作键、数字 `5` 投币、`Enter` 开始。游戏页会在非输入区域统一接管按键，并确保短按至少保持数帧；如果浏览器已经保存过旧键位，在底部“控制设置”中点击“重置”。

三国战纪 2007 快速集气版的游戏页提供人物出招表，可以按人物姓名、别名或招式名称搜索。出招表沿用街机 A/B/C/D 记法，页面会同步显示本站 `J/K/U/I` 的键位对应关系和斜方向组合说明。其它游戏目前不会显示该入口；以后可参照 `assets/move-lists.js` 中的 `kovplus2007` 数据为具体游戏 ID 单独补充，避免不同版本互相套用。

## Docker 部署

`docker-compose.yml` 默认把整个 `runtime/` 只读映射到 nginx，也可以通过 `ARCADE_DATA_DIR` 指定服务器资源目录：

```bash
docker compose up --build -d
# 在服务器已有独立资源目录时：
ARCADE_DATA_DIR=/app/arcade-games/arcade-games-data docker compose up --build -d
```

默认访问 `http://localhost:20001`。也可以使用带自动校验的部署脚本：

```bash
ARCADE_HOST_PORT=20002 ARCADE_DATA_DIR=/app/arcade-games/arcade-games-data bash ./deploy.sh
```

服务器数据目录结构：

```text
/app/arcade-games/arcade-games-data/
├── 拳皇97/
│   ├── roms/
│   ├── bios/
│   └── covers/
└── 三国战纪/
    ├── roms/
    ├── bios/
    └── covers/
```

部署脚本不会覆盖服务器已经维护的游戏资源。它会确认宿主机目录、Docker 实际挂载源和容器内 `/runtime/` JSON 接口一致，任一环节不正确都会停止并给出错误。直接在已经挂载的 `arcade-games-data` 目录内新增或更新游戏文件夹，不要删除并重新创建这个挂载根目录；Docker 对根目录本身的替换不会自动跟随。正常上传完成后无需重启容器，打开着的首页最多约 15 秒会发现新目录。沿用相同文件名替换 ROM 时建议点击“刷新”，并清理该游戏的 EmulatorJS ROM 缓存。

如果页面仍显示 `/runtime/` 404，先在服务器执行：

```bash
curl -i http://127.0.0.1:20001/runtime/
sudo docker inspect arcade-games-web --format '{{json .Mounts}}'
```

第一条应返回 `200` 和游戏目录 JSON，第二条的 `Source` 应为 `/app/arcade-games/arcade-games-data`。如果本机端口返回 200、公开域名却返回 404，说明最外层反向代理没有把 `/runtime/` 转发给 `arcade-games-web`，需要让它和首页走同一个上游。

`.drone.yml` 延续参考项目的“校验后 SSH 部署”流程。首次使用前需配置 `ssh_host`、`ssh_port`、`ssh_username`、`ssh_password` 和 `pushplus_token` 五个 Drone Secret，其中仓库克隆地址已固化在流水线配置中，无需额外配置。

## 存档说明

- 模拟器会把 NVRAM、存档槽和设置保存在当前站点的浏览器存储中。
- 点击模拟器工具栏的“保存状态”时，项目还会把最新即时存档写入自己的 IndexedDB；下次进入同一个游戏会询问是否继续。
- 点击“保存游戏存档”时，原生存档也会进入项目侧备份库。
- 当前存档只存在于当前浏览器和当前域名。清理站点数据、使用隐私模式或换域名都可能导致存档不可见。

`assets/storage.js` 中的 `SaveRepository` 约定是后续接后端的边界。后续可新增 HTTP 实现，把保存事件同步到服务端，并在启动前把即时存档转换成 Blob URL 传给 EmulatorJS。

## 新增其它街机游戏与 BIOS

在 `runtime/` 下新建以展示名称命名的目录，再分别放入主 ROM、BIOS、父 ROM 和封面。主 ROM 的英文短名称同时作为浏览器存档 ID，因此不要随意改名。Neo Geo 常用 `neogeo.zip`，IGS PGM 常用 `pgm.zip`；CPS1/CPS2 等不少街机板通常没有单独 BIOS。克隆/Hack 依赖的父包放入该游戏自己的 `parents/`，不要与主 ROM 混放，也不要解压或改名 ZIP 内的文件。

项目会让 EmulatorJS 原样保留 BIOS 和父 ROM 压缩包，FBNeo 才能按 romset 名称找到它们；不要预先把这些 ZIP 解压到挂载目录。

## 验证

```bash
npm test
npm run check
docker build -t arcade-games:test .
```
