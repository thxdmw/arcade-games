import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const deployScript = await readFile(new URL("../deploy.sh", import.meta.url), "utf8");

test("容器运行时探活优先复用站点镜像且没有镜像时不会静默跳过", () => {
  assert.match(deployScript, /"\$\{IMAGE_NAME\}:latest" node:22-alpine/);
  assert.match(deployScript, /docker pull alpine:latest/);
  assert.doesNotMatch(deployScript, /跳过容器运行时自检/);
});

test("探活失败会在镜像构建前停止部署", () => {
  const probePosition = deployScript.indexOf("docker run --rm --entrypoint /bin/true");
  const buildPosition = deployScript.indexOf("docker build -t");

  assert.ok(probePosition >= 0);
  assert.ok(buildPosition > probePosition);
});
