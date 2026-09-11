# 部署时的容器运行时故障排查

`deploy.sh` 的镜像构建要在 Dockerfile 的 `RUN` 步骤里真的起容器。容器起不来时，报错来自服务器的容器运行时（runc 及其 hook），不是本项目的代码或 npm 依赖。这份文档用于几步之内把两者分开。

## 症状

Drone 日志里，构建在第一个 `RUN` 步骤失败，**看不到 npm 的任何输出**，只有一段 Go 堆栈：

```
#13 [emulator-assets 4/7] RUN npm ci --omit=optional
#13 0.256 runc run failed: unable to start container process: error during container init:
error running prestart hook #0: exit status 2, stdout: , stderr:
runtime: nameOff 0xbd2b94 out of range ...
fatal error: runtime: name offset out of range
#13 ERROR: process "/bin/sh -c npm ci --omit=optional" did not complete successfully: exit code: 1
```

三条同时成立，就可以确定与仓库无关：

1. 失败的步骤是 `RUN`，且耗时不到一秒——`npm` 根本没启动。
2. 报错前缀是 `runc run failed` / `error running prestart hook #0`，属于容器初始化阶段。
3. `stderr` 是 Go 运行时 panic（`fatal error: runtime: ...`），来自被当作 prestart hook 执行的二进制，不是 npm 的报错。

`name offset out of range` 的含义是这个 Go 二进制自身的类型元数据对不上，现实成因只有「二进制被写坏」或「二进制不是正常构建的」。此时宿主机上**任何** `docker run` 都会失败，所以在别的机器上构建好再 `docker load` 也救不了。

## 为什么可能很久没暴露

Docker 按内容缓存 `RUN` 步骤，本项目的构建里：

| 步骤 | 缓存键 |
| --- | --- |
| `RUN npm ci --omit=optional` | `package.json` + `package-lock.json` 的内容 |
| `RUN npm run prepare:emulator` | `scripts/` 下的内容（在 `COPY scripts/` 之后） |

只改 `assets/`、`index.html`、`vendor/` 的提交会命中缓存，构建全程不起容器，于是故障可以静默存在很久，直到某次提交动了 `package.json` 或锁文件才第一次撞上。反过来说，遇到这个报错时先用 `git log` 找到**上一次真正执行过 `RUN` 的部署是什么时候**，就能把服务器的变更时间窗缩到那之后（查日志里 `COPY package.json package-lock.json` 那一行是不是 `CACHED`，可以判断这次构建有没有真的起过容器）。

## 排查步骤

以下命令都在服务器上执行。

```bash
# ① 不经 build 直接复现，跑两次确认是否稳定
sudo docker run --rm alpine echo container-ok

# ② 找出崩的是哪个二进制：Go 二进制保留函数名，把 panic 栈里的符号拿出来搜
sudo grep -rla --binary-files=text 'google_api_client_proto_init' \
  /usr/bin /usr/sbin /usr/local/bin /usr/local/sbin /usr/libexec /opt 2>/dev/null

# ③ 看运行时配置里挂了哪些 hook、默认 runtime 是谁
sudo cat /etc/docker/daemon.json
sudo docker info --format 'default-runtime={{.DefaultRuntime}} runtimes={{range $k,$v := .Runtimes}}{{$k}} {{end}}'
sudo cat /etc/nvidia-container-runtime/config.toml 2>/dev/null
ls -l /etc/containers/oci/hooks.d/ /usr/share/containers/oci/hooks.d/ 2>/dev/null
sudo journalctl -u docker -n 80 --no-pager

# ④ 包是否损坏，磁盘和文件系统是否出过错
dpkg -l | grep -E 'docker|containerd|runc'
sudo dpkg -V docker-ce docker-ce-cli containerd.io runc 2>&1 | head -20
df -h /var/lib/docker /usr/bin
sudo dmesg -T | grep -iE 'i/o error|ext4-fs error|xfs.*error|blk_update_request' | tail -20
grep -iE 'docker|containerd' /var/log/apt/history.log | tail -30
```

② 的符号名取自本次 panic，换一个 panic 就换成栈里出现的任意函数名。按 ③④ 的输出分流：

| 观察到的现象 | 结论 |
| --- | --- |
| `daemon.json` 里有 nvidia 或第三方 runtime/hook | hook 来自第三方组件，按下面 A 处理 |
| `dpkg -V` 有输出 | 包内文件与包记录不一致，按下面 B 重装对应包 |
| `dmesg` 有 I/O error 或文件系统报错 | 磁盘先修，否则重装后可能再次损坏，属于硬件/系统问题 |
| 以上都没有 | 二进制被静默改过，同样按 B 重装 |

## 修复

```bash
# A. 第三方 hook（最常见的是 nvidia-container-toolkit）：
#    纯静态站点不需要 GPU，把 /etc/docker/daemon.json 的 default-runtime 改回 runc
#    或删掉该项、卸载对应 toolkit，然后重启
sudo systemctl restart docker

# B. Docker 官方包损坏
sudo systemctl stop docker docker.socket
sudo apt-get install --reinstall -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker

# 无论走哪条，都要复验到打印出 container-ok
sudo docker run --rm alpine echo container-ok
```

修好后不必等 CI，直接在服务器的仓库目录里重跑：

```bash
sudo env DEPLOY_RELEASE_TAG=<commit sha> bash ./deploy.sh
```

## 不要做的事

- **反复重试构建**：Go 包初始化阶段的 panic 是确定性的，重试无用。只有 ① 两次结果不同才值得怀疑磁盘偶发读坏。
- **换一台机器构建再 `docker save` / `docker load`**：新容器同样要经过这个 hook，宿主机不修好照样起不来。
- **改 `package.json` 或 Dockerfile**：失败发生在 `npm` 启动之前，动依赖版本不会有任何作用。

## deploy.sh 的前置自检

`deploy.sh` 现在会先确认 `docker info` 可用，再用一个本地已有的镜像起一次最小容器探活。失败时直接打印中文错误并指向本文档，不会再让构建抛出难懂的 Go 堆栈。探活本身误报时，可以用 `ARCADE_SKIP_RUNTIME_PROBE=1` 跳过这次检查。
