FROM node:15.11.0-slim 

# service name of docker-compose since it is networked by bridge network
ENV POSTGRES_HOST=database
ENV POSTGRES_USER=postgres
ENV POSTGRES_PW=pwpostgres
ENV POSTGRES_PORT=5432
ENV POSTGRES_DB=pssrv

ENV APP_PORT=4430
ENV APP_HOST=127.0.0.1

ENV HTTP_API_KEY=someApiKey
ENV CERT_CERT=someCert
ENV CERT_KEY=someKey

ENV ENV=local

WORKDIR /app

COPY package*.json ./

RUN npm ci --legacy-peer-deps

COPY . .

EXPOSE $EXPOSED_PORT_ARG

CMD ["npm", "run", "run", "-y"]