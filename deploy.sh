#!/usr/bin/env bash
# 服务器端部署脚本：构建纯静态街机厅镜像，并保留宿主机上的 ROM、BIOS 和封面。
set -eu

IMAGE_NAME="arcade-games"
CONTAINER_NAME="arcade-games-web"
HOST_PORT="${ARCADE_HOST_PORT:-20001}"
DATA_DIR="${ARCADE_DATA_DIR:-/app/arcade-games/arcade-games-data}"
RELEASE_TAG="${DEPLOY_RELEASE_TAG:-latest}"

echo "==> 准备资源目录 ${DATA_DIR}"
sudo mkdir -p "${DATA_DIR}/roms" "${DATA_DIR}/bios" "${DATA_DIR}/covers"

echo "==> 构建镜像 ${IMAGE_NAME}:${RELEASE_TAG}"
sudo docker build -t "${IMAGE_NAME}:${RELEASE_TAG}" -t "${IMAGE_NAME}:latest" .

if [ -n "$(sudo docker ps -a --filter name=^/${CONTAINER_NAME}\$ --format '{{.Names}}')" ]; then
    echo "==> 停止并删除旧容器 ${CONTAINER_NAME}"
    sudo docker stop "${CONTAINER_NAME}"
    sudo docker rm "${CONTAINER_NAME}"
fi

echo "==> 启动容器（0.0.0.0:${HOST_PORT} -> 80）"
sudo docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    -p "${HOST_PORT}:80" \
    -v "${DATA_DIR}/roms:/usr/share/nginx/html/roms:ro" \
    -v "${DATA_DIR}/bios:/usr/share/nginx/html/bios:ro" \
    -v "${DATA_DIR}/covers:/usr/share/nginx/html/covers:ro" \
    "${IMAGE_NAME}:latest"

sudo docker image prune -f >/dev/null
echo "==> 部署完成"
