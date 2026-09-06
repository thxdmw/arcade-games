# Arcade Vault

一个可自行部署的纯前端网页街机厅。浏览器使用 FBNeo WebAssembly 核心运行街机 ROM；服务器只负责发送静态文件，不参与模拟、账号或存档。

当前预置游戏清单覆盖拳皇系列（Neo Geo）和三国战纪系列（IGS PGM）。项目不包含 ROM、BIOS 或商业封面，请只使用你有权使用的资源。

> FBNeo 的原始代码许可限制商业获利，也禁止无合法授权地把模拟器与 ROM 一起分发。公开或商业部署前请阅读 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) 及上游完整许可。

## 快速启动

需要 Node.js 20 或更高版本：

```bash
npm ci --omit=optional
npm run prepare:emulator
npm run dev
```

打开 `http://localhost:5173`。把资源放入以下目录后刷新首页：

```text
runtime/
├── roms/
│   ├── kof97.zip
│   ├── kof2002.zip
│   ├── kof10th.zip
│   ├── kov.zip
│   └── kovplus.zip
├── bios/
│   ├── neogeo.zip
│   └── pgm.zip
└── covers/
```

实际文件名和父 ROM 关系由 [`config/games.json`](config/games.json) 配置。FBNeo 对 romset 版本很敏感；压缩包能被下载不代表一定与本项目固定的 FBNeo 4.2.3 核心匹配。

默认键盘操作为 `WASD` 移动、`JKUI` 四个动作键、数字 `5` 投币、`Enter` 开始。游戏页会在非输入区域统一接管按键，并确保短按至少保持数帧；如果浏览器已经保存过旧键位，在底部“控制设置”中点击“重置”。

## Docker 部署

`docker-compose.yml` 已把三个资源目录映射到 nginx：

```bash
docker compose up --build -d
```

默认访问 `http://localhost:20002`。也可以参考同级 `game` 项目直接运行：

```bash
ARCADE_HOST_PORT=20002 ARCADE_DATA_DIR=/app/arcade-games-data bash ./deploy.sh
```

服务器数据目录结构：

```text
/app/arcade-games-data/
├── roms/
├── bios/
├── covers/
└── config/games.json
```

部署脚本只会在 `games.json` 不存在时复制默认清单，不会覆盖服务器已经维护的清单或游戏资源。

`.drone.yml` 延续参考项目的“校验后 SSH 部署”流程。首次使用前需配置 `ssh_host`、`ssh_port`、`ssh_username`、`ssh_password` 和 `arcade_repository_url` 五个 Drone Secret。

## 存档说明

- 模拟器会把 NVRAM、存档槽和设置保存在当前站点的浏览器存储中。
- 点击模拟器工具栏的“保存状态”时，项目还会把最新即时存档写入自己的 IndexedDB；下次进入同一个游戏会询问是否继续。
- 点击“保存游戏存档”时，原生存档也会进入项目侧备份库。
- 当前存档只存在于当前浏览器和当前域名。清理站点数据、使用隐私模式或换域名都可能导致存档不可见。

`assets/storage.js` 中的 `SaveRepository` 约定是后续接后端的边界。后续可新增 HTTP 实现，把保存事件同步到服务端，并在启动前把即时存档转换成 Blob URL 传给 EmulatorJS。

## 新增其它街机游戏

在 `config/games.json` 追加条目即可；FBNeo 支持的其它街机平台仍使用 `core: "fbneo"`。如果将来接入非街机平台，需要同时安装相应 EmulatorJS 核心，并在构建脚本中复制该核心资源。

## 验证

```bash
npm test
npm run check
docker build -t arcade-games:test .
```
