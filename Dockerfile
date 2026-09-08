FROM node:22-alpine AS emulator-assets

WORKDIR /site
COPY package.json package-lock.json ./
RUN npm ci --omit=optional
COPY scripts/prepare-emulator.mjs scripts/prepare-emulator.mjs
RUN npm run prepare:emulator

FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html play.html manifest.webmanifest /usr/share/nginx/html/
COPY THIRD_PARTY_NOTICES.md /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY --from=emulator-assets /site/public/emulatorjs /usr/share/nginx/html/emulatorjs

RUN mkdir -p /usr/share/nginx/html/runtime

EXPOSE 80
