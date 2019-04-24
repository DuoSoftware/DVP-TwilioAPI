FROM node:10.15.3
ARG VERSION_TAG
RUN git clone -b $VERSION_TAG https://github.com/DuoSoftware/DVP-TwilioAPI.git /usr/local/src/twilioapi
RUN cd /usr/local/src/twilioapi;
WORKDIR /usr/local/src/twilioapi
RUN npm install
EXPOSE 8832
CMD [ "node", "/usr/local/src/voxboneapi/app.js" ]
