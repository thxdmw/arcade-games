# 第三方软件说明

本项目在构建时复制以下第三方软件的运行文件，但不包含任何游戏 ROM、BIOS 或商业游戏美术资源。

## EmulatorJS 4.2.3

- 项目：https://github.com/EmulatorJS/EmulatorJS
- 许可：GNU General Public License v3.0
- 完整许可随构建产物保存在 `/emulatorjs/data/LICENSE-EmulatorJS.txt`

## FinalBurn Neo / EmulatorJS FBNeo Core 4.2.3

- 核心项目：https://github.com/EmulatorJS/FBNeo
- 上游项目：https://github.com/finalburnneo/FBNeo
- 完整许可：https://github.com/finalburnneo/FBNeo/blob/master/src/license.txt

项目分发的 `vendor/core-fbneo/` 是基于固定上游提交构建的修改版，新增 `kovplus2007` 驱动；对应源码差异公开保存在 `patches/fbneo-kovplus2007.patch`，固定版本及重建方法见 `docs/custom-fbneo-core.md`。每个核心数据包中均携带构建时的完整 FBNeo 许可文本。

FBNeo 包含采用不同许可证的多个组件。其原创材料的许可包含非商业、公开源码改动、携带完整许可、不得与无合法分发权的 ROM 一起分发等限制。部署者必须自行确认使用场景及所提供游戏资源的授权情况。

本文件只是依赖与许可入口说明，不构成法律意见。
