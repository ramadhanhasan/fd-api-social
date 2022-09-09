FROM node:14

WORKDIR /app
RUN yarn global add @nestjs/cli
RUN yarn install --production=true
COPY . /app
RUN npm install
EXPOSE 3300

ENV TZ=Asia/Jakarta
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

CMD ["node", "index"]