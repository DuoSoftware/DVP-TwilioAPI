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
const {getCode, getName} = require('country-list');

const twilioUrl = config.Services.twilioUrl;

const accountSid = 'AC571130f9c2b2e54511df067c5de360fb';
const authToken = 'c9703e3b080634a487bc8294d514de8a';

const client = require('twilio')(accountSid, authToken);

const TwilioAccount = require('dvp-mongomodels/model/Twilio').TwilioAccount;
var UserAccount = require('dvp-mongomodels/model/UserAccount');
var Org = require('dvp-mongomodels/model/Organisation');


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

    async _ValidatePhoneNumber(phoneNumber, isoCountry, numberType) {
        return new Promise(function (resolve, reject) {
            if (numberType === 'local') {

                client
                    .availablePhoneNumbers(isoCountry)
                    .local.list({
                    contains: phoneNumber
                })
                    .then(availablePhoneNumbers => {
                        if (availablePhoneNumbers === undefined || availablePhoneNumbers.length == 0) {
                            reject(false)
                        } else {
                            resolve(true)
                        }

                    }).catch(err => {
                    console.log(err);
                    reject(err)
                });
            } else if (numberType === 'mobile') {
                client
                    .availablePhoneNumbers(isoCountry)
                    .mobile.list({
                    contains: phoneNumber
                })
                    .then(availablePhoneNumbers => {
                        if (availablePhoneNumbers === undefined || availablePhoneNumbers.length == 0) {
                            reject(false)
                        } else {
                            resolve(true)
                        }

                    }).catch(err => {
                    console.log(err);
                    reject(err)
                });
            } else if (numberType === 'toll-free') {
                client
                    .availablePhoneNumbers(isoCountry)
                    .tollFree.list({
                    contains: phoneNumber
                })
                    .then(availablePhoneNumbers => {
                        if (availablePhoneNumbers === undefined || availablePhoneNumbers.length == 0) {
                            reject(false)
                        } else {
                            resolve(true)
                        }

                    }).catch(err => {
                    console.log(err);
                    reject(err)
                });
            }
        })
    }

    async _NumberPrice(country, numberType) {

        return new Promise(function (resolve, reject) {
                client.pricing.phoneNumbers
                    .countries(country)
                    .fetch()
                    .then(country => {
                        country.phoneNumberPrices.forEach(price => {
                            if (price.number_type === numberType) { // assumed that the api returns USD
                                console.log(`${price.number_type} ${price.current_price}`);
                                resolve(parseFloat(price.current_price))
                            }
                        });
                        reject(false);
                    })
                    .catch(error => {
                        console.log(error);
                        reject(error)
                    });
            }
        )
    }

    async _AssignNumberToTrunk(phoneNumber) {

        let operator = 'TWILIO';
        let trunkId = 1; // todo get from new trunk endpoint
        let companyInfo = util.format("%d:%d", tenant, company);
        let phoneNumberTrunkURL = util.format("http://%s/DVP/API/%s/PhoneNumberTrunkApi/Operator/%s/Trunk/%s/Numbers", config.Services.billingserviceHost, config.Services.billingserviceVersion, operator, trunkId);

        if (validator.isIP(config.Services.billingserviceHost)) {

            phoneNumberTrunkURL = util.format("http://%s/DVP/API/%s/PhoneNumberTrunkApi/Operator/%s/Trunk/%s/Numbers", config.Services.billingserviceHost, config.Services.billingservicePort, config.Services.billingserviceVersion, operator, trunkId);

        }

        let jsonStr = JSON.stringify(billInfo);
        let accessToken = 'bearer ' + config.Services.accessToken;
        let options = {
            url: phoneNumberTrunkURL,
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
        let result = [];
        client.pricing.phoneNumbers.countries.list().then(function (countries) {

                countries.forEach(country => {
                        result.push({
                            country: country.country,
                            isoCountry: country.isoCountry
                        })
                    }
                );
                jsonString = messageFormatter.FormatMessage(undefined, "Countries retrieved successfully", true, result);
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

        let numberPrice;
        try {/**/
            numberPrice = await this._NumberPrice(country, 'local');
        }
        catch(e){
                jsonString = messageFormatter.FormatMessage(e, "No Local phone numbers found for searched country", false);
                res.end(jsonString);
            }


        client.availablePhoneNumbers(country).local.list()
            .then(availablePhoneNumbers => {
                availablePhoneNumbers.map(v => {
                    v.numberPrice = numberPrice;
                    v.numberType = 'Local';
                    v.countryName = getName(country);
                    v.voice = v.capabilities.voice;
                    v.SMS = v.capabilities.SMS;
                    v.MMS = v.capabilities.MMS;
                    v.fax = v.capabilities.fax;
                    delete v.capabilities;
                });

                jsonString = messageFormatter.FormatMessage(undefined, "Phone numbers retrieved successfully", true, availablePhoneNumbers);
                res.end(jsonString);
            })
            .catch(error => {
                jsonString = messageFormatter.FormatMessage(error, "No Local phone numbers found for searched country", false);
                res.end(jsonString);
            })
    }

    async GetTollFreePhoneNumbersByCountry(req, res) {
        let jsonString;
        let country = req.params.country;

        let numberPrice;
        try {
            numberPrice = await this._NumberPrice(country, 'toll free');
        }
        catch (e) {
            jsonString = messageFormatter.FormatMessage(e, "No Toll Free phone numbers found for searched country", false);
            res.end(jsonString);
        }

        client.availablePhoneNumbers(country).tollFree.list()
            .then(availablePhoneNumbers => {
                availablePhoneNumbers.map(v => {
                    v.numberPrice = numberPrice;
                    v.numberType = 'Toll Free';
                    v.countryName = getName(country);
                    v.voice = v.capabilities.voice;
                    v.SMS = v.capabilities.SMS;
                    v.MMS = v.capabilities.MMS;
                    v.fax = v.capabilities.fax;
                    delete v.capabilities;
                });
                jsonString = messageFormatter.FormatMessage(undefined, "Phone numbers retrieved successfully", true, availablePhoneNumbers);
                res.end(jsonString);
            })
            .catch(error => {
                console.log(error);
                jsonString = messageFormatter.FormatMessage(error, "No toll-free phone numbers found for searched country", false);
                res.end(jsonString);
            })
    }

    async GetMobilePhoneNumbersByCountry(req, res) {
        let jsonString;
        let country = req.params.country;

        let numberPrice;
        try {
            numberPrice = await this._NumberPrice(country, 'mobile');
        }
        catch (e) {
            jsonString = messageFormatter.FormatMessage(e, "No Mobile phone numbers found for searched country", false);
            res.end(jsonString);
        }
        client.availablePhoneNumbers(country).mobile.list()
            .then(availablePhoneNumbers => {
                availablePhoneNumbers.map(v => {
                    v.numberPrice = numberPrice;
                    v.numberType = 'Mobile';
                    v.countryName = getName(country);
                    v.voice = v.capabilities.voice;
                    v.SMS = v.capabilities.SMS;
                    v.MMS = v.capabilities.MMS;
                    v.fax = v.capabilities.fax;
                    delete v.capabilities;
                });
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
        let isoCountry = req.params.isoCountry;
        let numberType = req.params.numberType;
        let company = parseInt(req.user.company);
        let tenant = parseInt(req.user.tenant);

        let creditDetails = await this._CheckCredit(company, tenant);
        let availableCredit = parseFloat(creditDetails.Credit);
        console.log(availableCredit);

        try {
            await this._ValidatePhoneNumber(phoneNumber, isoCountry, numberType);
        } catch (e) {
            jsonString = messageFormatter.FormatMessage(e, "The selected phonenumber is not available ot purchase in given country", false);
            return res.end(jsonString);
        }

        let numberPrice;
        try {
            numberPrice = await this._NumberPrice(isoCountry, numberType);
        } catch (e) {
            jsonString = messageFormatter.FormatMessage(e, "Error occurred while fetching number prices", false);
            return res.end(jsonString);
        }
        if (availableCredit < numberPrice) { // stop if insufficient balance in wallet
            jsonString = messageFormatter.FormatMessage(undefined, "Insufficient balance in your wallet", false);
            return res.end(jsonString)
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

            let rUser = await UserAccount.findOne({
                tenant: tenant,
                company: company,
                user: req.user.iss
            }).populate('userref', '-password');

            let userRef = rUser.userref;

            let org = await Org.findOne({tenant: tenant, id: company}).populate('ownerRef', '-password');

            let billingObj = {
                userInfo: userRef,
                companyInfo: org,
                name: phoneNumber,
                type: "PHONE_NUMBER",
                category: "DID",
                setupFee: 0,
                unitPrice: numberPrice,
                units: 1,
                description: 'Number fee',
                date: Date.now(),
                valid: true,
                isTrial: false
            };


            try {
                let deductWallet = await this._DeductCredit(company, tenant, billingObj); // buy package to deduct from wallet

            } catch (e) {
                jsonString = messageFormatter.FormatMessage(err, "Credit deduction from wallet failed", false, err);
                res.end(jsonString);
            }

            try {
                let purchasedNumber = await client.incomingPhoneNumbers.create({ // purchase the number for the created subaccount
                    phoneNumber: phoneNumber,
                    AccountSid: accSid
                })
            } catch (e) {
                // todo Refund wallet deduction
                jsonString = messageFormatter.FormatMessage(undefined, "Error occurred while purchasing a phone number", false, error);
                res.end(jsonString);

            }


        }

    }
};

