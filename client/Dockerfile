FROM node:latest
MAINTAINER dan budris <dbudris@bu.edu>

RUN apt-get update -y
RUN npm install -g serve

WORKDIR /srv
RUN mkdir ./build
COPY . ./build

EXPOSE 5000

CMD serve -s build
