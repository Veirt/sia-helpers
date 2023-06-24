FROM node:20-slim as builder

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN PUPPETEER_SKIP_DOWNLOAD=true yarn install --frozen-lockfile

COPY . .

RUN yarn build


FROM node:20-slim

RUN apt-get update -y \ 
    && apt-get install chromium -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --production --frozen-lockfile && yarn cache clean

COPY --from=builder /usr/src/app/dist ./dist

CMD ["yarn", "start"]
