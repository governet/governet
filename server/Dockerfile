FROM node:latest
MAINTAINER dan budris <dbudris@bu.edu>

RUN apt-get update -y

WORKDIR /srv
COPY serve.js .
COPY package-lock.json .
copy package.json .
RUN npm install 

EXPOSE 8080

CMD node serve.js
