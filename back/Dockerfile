FROM thecodingmachine/nodejs:12

COPY . .
RUN yarn install

ENV NODE_ENV=production

CMD ['yarn', 'run', 'prod']
