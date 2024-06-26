FROM node:22-alpine as builder

WORKDIR /usr/src/app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

RUN yarn install --immutable

COPY . .

RUN yarn build


FROM node:22-alpine

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

RUN yarn workspaces focus --all --production && yarn cache clean

COPY --from=builder /usr/src/app/dist ./dist
COPY ./views ./views

CMD ["yarn", "start:all"]
