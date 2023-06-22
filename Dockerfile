FROM node:20-slim as builder


WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN PUPPETEER_SKIP_DOWNLOAD=true yarn install --frozen-lockfile

COPY . .

RUN yarn build


FROM node:20-alpine

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont 

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --production --frozen-lockfile && yarn cache clean

COPY --from=builder /usr/src/app/dist ./dist

CMD ["yarn", "start"]
