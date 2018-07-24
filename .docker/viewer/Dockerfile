FROM alpine:3.8

ENV VIEWER_PORT=8000

WORKDIR /app

EXPOSE ${VIEWER_PORT}

RUN apk add --no-cache nodejs-npm && \
    apk add --no-cache --virtual .build-deps git

CMD npm install && npm start