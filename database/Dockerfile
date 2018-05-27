FROM mongo:latest
MAINTAINER dan budris <dbudris@bu.edu>

# install pip, and use it to install the AWS CLI
RUN apt-get update && apt-get install python-pip wget unzip -y
RUN pip install awscli

# set up the directory where we'll download the database dump from s3
WORKDIR /opt
RUN mkdir dump
RUN mkdir ./dump/governet

# download the DB dump from S3, restore it to the DB, and create the indexes
WORKDIR /opt/dump/governet
RUN aws s3 cp --no-sign-request --recursive s3://governet-dumps ./
RUN ls
RUN mongod --fork --syslog \
    && mongorestore /opt/dump/governet \
    && mongo governet --eval "db.cm.createIndex({CMTE_ID: 1, CAND_ID: 1})" \
    && mongo governet --eval "db.cn.createIndex({CAND_ID: 1})" \
    && mongo governet --eval "db.pas2.createIndex({CAND_ID: 1, CMTE_ID: 1})"

COPY ./headerGetter.sh /opt

# expose the mongo port
EXPOSE 27017
