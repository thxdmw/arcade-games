#!/usr/bin/env bash
# 服务器端部署脚本：构建纯静态街机厅镜像，并保留宿主机上的 ROM、BIOS 和封面。
set -eu

IMAGE_NAME="arcade-games"
CONTAINER_NAME="arcade-games-web"
HOST_PORT="${ARCADE_HOST_PORT:-20001}"
DATA_DIR="${ARCADE_DATA_DIR:-/app/arcade-games/arcade-games-data}"
RELEASE_TAG="${DEPLOY_RELEASE_TAG:-latest}"

case "${DATA_DIR}" in
    /*) ;;
    *) DATA_DIR="$(pwd)/${DATA_DIR#./}" ;;
esac

echo "==> 准备资源目录 ${DATA_DIR}"
sudo mkdir -p "${DATA_DIR}"
sudo chmod -R a+rX "${DATA_DIR}"

if ! sudo find "${DATA_DIR}" -mindepth 3 -maxdepth 3 -type f -path '*/roms/*.zip' -print -quit | grep -q .; then
    echo "错误：${DATA_DIR} 中没有找到 游戏名称/roms/*.zip"
    echo "请确认资源上传到了这个目录，而不是仓库内的 runtime 或其它同名目录。"
    exit 1
fi

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
    --mount "type=bind,src=${DATA_DIR},dst=/usr/share/nginx/html/runtime,readonly" \
    "${IMAGE_NAME}:latest"

echo "==> 校验资源挂载和目录接口"
MOUNT_SOURCE="$(sudo docker inspect "${CONTAINER_NAME}" --format '{{range .Mounts}}{{if eq .Destination "/usr/share/nginx/html/runtime"}}{{.Source}}{{end}}{{end}}')"
if [ "${MOUNT_SOURCE}" != "${DATA_DIR}" ]; then
    echo "错误：容器实际挂载目录为 ${MOUNT_SOURCE:-未挂载}，期望 ${DATA_DIR}"
    exit 1
fi

RUNTIME_INDEX=""
for ATTEMPT in 1 2 3 4 5 6 7 8 9 10; do
    if RUNTIME_INDEX="$(sudo docker exec "${CONTAINER_NAME}" wget -qO- http://127.0.0.1/runtime/)"; then
        break
    fi
    sleep 1
done
if [ -z "${RUNTIME_INDEX}" ]; then
    echo "错误：容器内 /runtime/ 无法访问，请检查 nginx 配置和目录权限。"
    exit 1
fi
printf '%s\n' "${RUNTIME_INDEX}" | grep -q '"type":"directory"' || {
    echo "错误：/runtime/ 没有返回游戏目录，请检查 ${DATA_DIR} 下的目录层级。"
    exit 1
}

sudo docker image prune -f >/dev/null
echo "==> 部署完成，资源目录：${MOUNT_SOURCE}"
