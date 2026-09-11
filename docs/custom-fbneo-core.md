# 定制 FBNeo 核心

## 为什么使用独立驱动

三国战纪 2007 快速集气版的修改程序与上游 `kovplus` 使用相同游戏来源，但程序 CRC 不同。直接把修改版继续命名为 `kovplus.zip` 会覆盖原版语义，也会被原版驱动按 CRC 拒绝。项目因此新增短名称 `kovplus2007`，保留原版 `kovplus` 不变。

页面仍按 `runtime/` 下的文件夹名称展示游戏，不读取 `game.json`。`runtime/三国战纪_2007快速集气版_修改版/roms/kovplus2007.zip` 是完整合并包，内部修改程序名为 `p0600.119`、大小为 `0x0400000`、CRC32 为 `b2ee0885`；BIOS 单独放在同一游戏目录的 `bios/pgm.zip`。

## 固定构建版本

| 组件 | 固定版本 |
| --- | --- |
| EmulatorJS npm 运行时 | `4.2.3` |
| EmulatorJS/build | `b24e5b535034dc7c3428d76f236d4793881969b6` |
| EmulatorJS/RetroArch | `6dd4353937ef48b6ec0bfbdbb15d1c5992d86927` |
| EmulatorJS/EmulatorJS | `0131c16ab5e7264e2dcb8bc8029b789d2095d89f` |
| EmulatorJS/FBNeo | `0d5bc6e2986856c10ec697940d48f1b6e915db1b` |
| Emscripten | `3.1.74` |

这些提交取自 npm `@emulatorjs/core-fbneo@4.2.3` 构建报告记录的 2025-06-14 构建时间，避免用最新 FBNeo 生成与现有 ROM set 不一致的核心。

## 源码与产物

- `patches/fbneo-kovplus2007.patch`：应用到固定 FBNeo 提交，新增驱动和 ROM 校验定义。
- `vendor/core-fbneo/*.data`：普通、legacy、thread、thread-legacy 四种浏览器核心。
- `vendor/core-fbneo/SHA256SUMS`：四个构建产物的完整性校验值。
- `vendor/core-fbneo/reports/fbneo.json`：实际定制构建报告。
- `scripts/prepare-emulator.mjs`：部署时优先复制上述定制核心；四个文件缺少任何一个都会停止构建。

重新构建时应在大小写敏感的 Linux 文件系统或官方开发容器中使用 EmulatorJS/build，固定表中全部提交，向 FBNeo 应用补丁，并强制重新生成 `src/dep/generated/driverlist.h`。完成后先确认解出的 `fbneo_libretro.wasm` 包含 `kovplus2007`，再替换四个 `.data` 文件并运行项目验证。

不要把 ROM、BIOS 或商业封面放入 `vendor/`。它们仍只允许出现在被忽略的 `runtime/` 或服务器挂载数据目录中。
