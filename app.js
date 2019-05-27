/**
 * Created by Marlon on 4/24/2019.
 */

const { plugins, createServer } = require('restify');
const config = require('config');
const port = config.Host.port || 3000;
const host = config.Host.vdomain || 'localhost';
const mongomodel = require('dvp-mongomodels');

const logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
const authorization = require('dvp-common/Authentication/Authorization.js');
const secret = require('dvp-common/Authentication/Secret.js');
const corsMiddleware = require('restify-cors-middleware');
const {TwilioHandler} = require('./TwilioHandler');
const jwt = require('restify-jwt');

const twilioHandler = new TwilioHandler();


//-------------------------  Restify Server ------------------------- \\
var RestServer = createServer({
    name: "TwilioApi",
    version: '1.0.0'
});

const cors = corsMiddleware({
    allowHeaders: ['authorization']
});

RestServer.pre(cors.preflight);
RestServer.use(cors.actual);
RestServer.use(jwt({secret: secret.Secret}));

RestServer.use(plugins.queryParser({
    mapParams: true
}));

RestServer.use(plugins.bodyParser({
    mapParams: true
}));


RestServer.get('/DVP/API/:version/twilio/Countries',authorization({resource:"twilio", action:"read"}), function (req, res) {
    twilioHandler.ListContries(req, res);
});
RestServer.get('/DVP/API/:version/twilio/PhoneNumbers/Local/:country',authorization({resource:"twilio", action:"read"}), function (req, res) {
    twilioHandler.GetLocalPhoneNumbersByCountry(req, res);
});
RestServer.get('/DVP/API/:version/twilio/PhoneNumbers/TollFree/:country',authorization({resource:"twilio", action:"read"}), function (req, res) {
    twilioHandler.GetTollFreePhoneNumbersByCountry(req, res);
});
RestServer.get('/DVP/API/:version/twilio/PhoneNumbers/Mobile/:country',authorization({resource:"twilio", action:"read"}), function (req, res){
    twilioHandler.GetMobilePhoneNumbersByCountry(req, res);
});
RestServer.post('/DVP/API/:version/twilio/Buy/Number',authorization({resource:"twilio", action:"write"}), function(req, res){
    twilioHandler.BuyPhoneNumber(req, res);
});



RestServer.listen(port, function () {
    console.log('%s listening at %s', RestServer.name, RestServer.url);
});

