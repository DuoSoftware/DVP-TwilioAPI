/**
 * Created by Marlon on 4/25/2019.
 */

const messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
const logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
// var pricingApiHandler = require('./twilio/PricingAPIHandler');
// var phonenumberApiHandler = require('./twilio/PhoneNumbersAPIHandler');
const config = require('config');
const request = require('request');
const util = require('util');
const validator = require('validator');

const twilioUrl = config.Services.twilioUrl;

const accountSid = 'xxx';
const authToken = 'xxxx';

const client = require('twilio')(accountSid, authToken);

const TwilioAccount = require('dvp-mongomodels/model/Twilio').TwilioAccount;
// const UserGroup = require('dvp-mongomodels/model/UserGroup').UserGroup;

module.exports.TwilioHandler = class TwilioHandler {

    async _CheckCredit(company, tenant) {

        let companyInfo = util.format("%d:%d", tenant, company);
        let walletUrl = util.format("http://%s/DVP/API/%s/PaymentManager/Wallet", config.Services.walletserviceHost, config.Services.billingserviceVersion);

        if (validator.isIP(config.Services.walletserviceHost)) {

            walletUrl = util.format("http://%s:%s/DVP/API/%s/PaymentManager/Wallet", config.Services.walletserviceHost, config.Services.walletservicePort, config.Services.walletserviceVersion);

        }

        let accessToken = 'bearer ' + config.Services.accessToken;

        console.log('GetRequest:: %s', walletUrl);
        let options = {
            url: walletUrl,
            headers: {
                'content-type': 'application/json',
                'authorization': accessToken,
                'companyinfo': companyInfo
            }
        };

        return new Promise(function (resolve, reject) {
            try {
                request(options, function optionalCallback(err, httpResponse, body) {
                    if (err) {
                        console.log('Error occurred:', err);
                        reject(err);
                    }
                    console.log('Server returned: %j', body);
                    resolve(JSON.parse(body).Result);
                })
            } catch (ex) {
                reject(ex);
            }
        });

    }

    async _DeductCredit(company, tenant, billInfo) {

        let companyInfo = util.format("%d:%d", tenant, company);
        let billingUrl = util.format("http://%s/DVP/API/%s/Billing/BuyPackage", config.Services.billingserviceHost, config.Services.billingserviceVersion);

        if (validator.isIP(config.Services.billingserviceHost)) {

            billingUrl = util.format("http://%s:%s/DVP/API/%s/Billing/BuyPackage", config.Services.billingserviceHost, config.Services.billingservicePort, config.Services.billingserviceVersion);

        }

        let jsonStr = JSON.stringify(billInfo);
        let accessToken = 'bearer ' + config.Services.accessToken;
        let options = {
            url: billingUrl,
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'authorization': accessToken,
                'companyinfo': companyInfo
            },
            body: jsonStr
        };

        return new Promise(function (resolve, reject) {
            try {
                request.post(options, function optionalCallback(err, httpResponse, body) {
                    if (err) {
                        console.log('Error occurred:', err);
                        reject(err);
                    }
                    console.log('Server returned: %j', body);
                    resolve(JSON.parse(body).Result);
                })
            } catch (ex) {
                reject(ex);
            }
        });

    }

    async ListContries(req, res) {
        let jsonString;

        client.pricing.phoneNumbers.countries.list().then(function (countries) {
                jsonString = messageFormatter.FormatMessage(undefined, "Countries retrieved successfully", true, countries);
                res.end(jsonString);
            }
        )
            .catch(error => {
                console.log(error);
                res.end(error);
            })
    };

    async GetLocalPhoneNumbersByCountry(req, res) {
        let jsonString;
        let country = req.params.country;

        client.availablePhoneNumbers(country).local.list()
            .then(availablePhoneNumbers => {
                jsonString = messageFormatter.FormatMessage(undefined, "Phone numbers retrieved successfully", true, availablePhoneNumbers);
                res.end(jsonString);
            })
            .catch(error => {
                jsonString = messageFormatter.FormatMessage(undefined, "No Local phone numbers found for searched country", false, error);
                res.end(jsonString);
            })
    }

    async GetTollFreePhoneNumbersByCountry(req, res) {
        let jsonString;
        let country = req.params.country;

        client.availablePhoneNumbers(country).tollFree.list()
            .then(availablePhoneNumbers => {
                jsonString = messageFormatter.FormatMessage(undefined, "Phone numbers retrieved successfully", true, availablePhoneNumbers);
                res.end(jsonString);
            })
            .catch(error => {
                console.log(error);
                jsonString = messageFormatter.FormatMessage(undefined, "No toll-free phone numbers found for searched country", false, error);
                res.end(jsonString);
            })
    }

    async GetMobilePhoneNumbersByCountry(req, res) {
        let jsonString;
        let country = req.params.country;

        client.availablePhoneNumbers(country).mobile.list()
            .then(availablePhoneNumbers => {
                jsonString = messageFormatter.FormatMessage(undefined, "Phone numbers retrieved successfully", true, availablePhoneNumbers);
                res.end(jsonString);
            })
            .catch(error => {
                jsonString = messageFormatter.FormatMessage(undefined, "No mobile phone numbers found for searched country", false, error);
                res.end(jsonString);
            })
    }


    async BuyPhoneNumber(req, res) {
        let jsonString;
        let phoneNumber = req.params.number;
        let company = parseInt(req.user.company);
        let tenant = parseInt(req.user.tenant);

        let creditDetails = await this._CheckCredit(company, tenant);
        let availableCredit = creditDetails.Credit;
        console.log(availableCredit);

        if (availableCredit < 1) { // stop if insufficient balance in wallet, 1 is the price of a phonunumber #todo get price from api
            jsonString = messageFormatter.FormatMessage(undefined, "Insufficient balance in your wallet", false);
            res.end(jsonString)
        } else {
            let accSid = await TwilioAccount.find({company: company, tenant: tenant}).select('sid');

            if (accSid === undefined || accSid.length == 0) { // check if subaccount exist if not create
                const account = await client.api.accounts.create({friendlyName: 'Submarine'});

                accSid = account.sid;

                let twilioAcc = TwilioAccount({
                    company: company,
                    tenant: tenant,
                    sid: accSid,
                    created_at: Date.now(),
                    updated_at: Date.now(),
                    status: true

                });

                await twilioAcc.save();
            }
            

            client.incomingPhoneNumbers.create({ // purchase the number for the created subaccount
                phoneNumber: phoneNumber,
                AccountSid: accSid
            }).then(purchasedNumber => {
                console.log(purchasedNumber.sid);
                //deduct from wallet

                var billingObj = {
                    userInfo: rUser,
                    companyInfo: org,
                    name: purchasedNumber.sid,
                    type: "PHONE_NUMBER",
                    category: "DID",
                    setupFee: 1, //todo
                    unitPrice: 1, //todo
                    units: 1,
                    description: 'Number fee',
                    date: Date.now(),
                    valid: true,
                    isTrial: false
                };

                this._DeductCredit(company, tenant, billingObj).then((result) => {
                        //result if success
                        jsonString = messageFormatter.FormatMessage(undefined, "Phone number purchased successfully", true, purchasedNumber.sid);
                        res.end(jsonString);
                    }
                ).catch((err) => {
                        jsonString = messageFormatter.FormatMessage(err, "Credit deduction from wallet failed", false, err);
                        res.end(jsonString); //todo rollback the bought number
                    }
                );

            }).catch(
                error => {
                    jsonString = messageFormatter.FormatMessage(undefined, "Error occurred while purchasing a phone number", false, error);
                    res.end(jsonString);
                }
            );
        }
    }
};

