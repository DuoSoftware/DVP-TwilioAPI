/**
 * Created by Marlon on 4/25/2019.
 */

const messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
const logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
const config = require('config');
const request = require('request');
const util = require('util');
const validator = require('validator');
const {getCode, getName} = require('country-list');

const accountSid = config.Services.accountSidTwilio;
const authToken = config.Services.authTokenTwilio;

const client = require('twilio')(accountSid, authToken);

const TwilioAccount = require('dvp-mongomodels/model/Twilio').TwilioAccount;
const UserAccount = require('dvp-mongomodels/model/UserAccount');
const Org = require('dvp-mongomodels/model/Organisation');


module.exports.TwilioHandler = class TwilioHandler {

    async _CheckCredit(company, tenant) {

        let companyInfo = util.format("%d:%d", tenant, company);
        let walletUrl = util.format("http://%s/DVP/API/%s/PaymentManager/Wallet", config.Services.walletserviceHost, config.Services.billingserviceVersion);

        if (validator.isIP(config.Services.walletserviceHost)) {

            walletUrl = util.format("http://%s:%s/DVP/API/%s/PaymentManager/Wallet", config.Services.walletserviceHost, config.Services.walletservicePort, config.Services.walletserviceVersion);

        }

        let accessToken = 'bearer ' + config.Services.accessToken;

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
                        logger.error('[DVP-TwilioHandler._CheckCredit] - [%s] - Exception occurred on method _CheckCredit', body,  err);
                        return reject(err);
                    }
                    console.log('Server returned: %j', body);
                    return resolve(JSON.parse(body).Result);
                })
            } catch (ex) {
                logger.error('[DVP-TwilioHandler._CheckCredit] - [%s] - Exception occurred on method _CheckCredit', null,  err);
                return reject(ex);
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
                        logger.error('[DVP-TwilioHandler._DeductCredit] - [%s] - Exception occurred on method _DeductCredit', body,  err);
                        return reject(err);
                    }
                    console.log('Server returned: %j', body);
                    return resolve(JSON.parse(body).Result);
                })
            } catch (ex) {
                logger.error('[DVP-TwilioHandler._DeductCredit] - [%s] - Exception occurred on method _DeductCredit', null,  ex);
                return reject(ex);
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
                            return reject(false)
                        } else {
                            return resolve(true)
                        }

                    }).catch(err => {
                    logger.error('[DVP-TwilioHandler._ValidatePhoneNumber] - [%s] - Exception occurred on method _ValidatePhoneNumber', null,  err);
                    return reject(err)
                });
            } else if (numberType === 'mobile') {
                client
                    .availablePhoneNumbers(isoCountry)
                    .mobile.list({
                    contains: phoneNumber
                })
                    .then(availablePhoneNumbers => {
                        if (availablePhoneNumbers === undefined || availablePhoneNumbers.length == 0) {
                            return reject(false)
                        } else {
                            return resolve(true)
                        }

                    }).catch(err => {
                    logger.error('[DVP-TwilioHandler._ValidatePhoneNumber] - [%s] - Exception occurred on method _ValidatePhoneNumber', null,  err);
                    return reject(err)
                });
            } else if (numberType === 'toll free') {
                client
                    .availablePhoneNumbers(isoCountry)
                    .tollFree.list({
                    contains: phoneNumber
                })
                    .then(availablePhoneNumbers => {
                        if (availablePhoneNumbers === undefined || availablePhoneNumbers.length == 0) {
                            return reject(false)
                        } else {
                            return resolve(true)
                        }

                    }).catch(err => {
                    logger.error('[DVP-TwilioHandler._ValidatePhoneNumber] - [%s] - Exception occurred on method _ValidatePhoneNumber', null,  err);
                    return reject(err)
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
                        let price = null;
                        country.phoneNumberPrices.forEach(priceObj => {
                            if (priceObj.number_type === numberType) { // assumed that the api returns USD
                                price = parseFloat(priceObj.current_price)
                            }
                        });
                        if(price) {
                            return resolve(price)
                        }
                        else{
                            return reject(false)
                        }
                    })
                    .catch(error => {
                        logger.error('[DVP-TwilioHandler._NumberPrice] - [%s] - Exception occurred on method _NumberPrice', null,  error);
                        return reject(error)
                    });
            }
        )
    }

    async _AssignNumberToTrunk(tenant, company, phoneNumber, token) {

        const operator = config.Operator;
        const trunkID = config.TrunkID;
        let trunkUrl = util.format("http://%s/DVP/API/%s", config.Services.trunkServiceHost, config.Services.trunkServiceVersion);

        if (validator.isIP(config.Services.trunkServiceHost)) {

            trunkUrl = util.format("http://%s:%s/DVP/API/%s", config.Services.trunkServiceHost, config.Services.trunkServicePort, config.Services.trunkServiceVersion);

        }
        let data = {
            "Enable": true,
            "PhoneNumber": phoneNumber,
            "ObjCategory": "BOTH",
            "TrunkId": trunkID,
            "InboundLimitId": null,
            "OutboundLimitId": null,
            "BothLimitId": null
        };
        let options = {
            method: 'POST',
            uri: trunkUrl + '/PhoneNumberTrunkApi/TrunkNumber/Any',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(data)
        };

        return new Promise(function (resolve, reject) {
            try {
                request.post(options, function optionalCallback(err, httpResponse, body) {
                    if (err) {
                        console.log('Error occurred:', err);
                        logger.error('[DVP-TwilioHandler._AssignNumberToTrunk] - [%s] - Exception occurred on method _AssignNumberToTrunk', null,  err);
                        return reject(err);
                    }
                    console.log('Server returned: %j', body);
                    if (!JSON.parse(body).IsSuccess) {
                        logger.error('[DVP-TwilioHandler._AssignNumberToTrunk] - [%s] - Exception occurred on method _AssignNumberToTrunk', body,  err);
                        return reject(false);
                    } else {
                        return resolve(JSON.parse(body).Result);
                    }
                })
            } catch (ex) {
                return reject(ex);
            }
        });
    }

    async _CreateDefaultRuleInbound(tenant, company, phoneNumber) {

        let ruleUrl = util.format("http://%s/DVP/API/%s", config.Services.ruleserviceHost, config.Services.ruleserviceVersion);

        if (validator.isIP(config.Services.ruleserviceHost)) {

            ruleUrl = util.format("http://%s:%s/DVP/API/%s", config.Services.ruleserviceHost, config.Services.ruleservicePort, config.Services.ruleserviceVersion);

        }

        var data = {
            ANI: null,
            ANIRegExPattern: "ANY",
            CallRuleDescription: "Inbound Rule " + phoneNumber,
            Context: "ANY",
            DNIS: phoneNumber,
            Direction: "INBOUND",
            Enable: true,
            ObjCategory: "CALL",
            Priority: 1,
            RegExPattern: "STARTWITH",
            TrunkNumber: null
        };
        var options = {
            method: 'POST',
            uri: ruleUrl+'/CallRuleApi/CallRule',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'bearer ' + config.Services.accessToken,
                'companyinfo': tenant + ':' + company
            },
            body: JSON.stringify(data)
        };


        return new Promise(function (resolve, reject) {
            try {
                request.post(options, function optionalCallback(err, httpResponse, body) {
                    if (err) {
                        console.log('Error occurred:', err);
                        return reject(err);
                    }
                    console.log('Server returned: %j', body);
                    if (!JSON.parse(body).IsSuccess) {
                        logger.error('[DVP-TwilioHandler._CreateDefaultRuleInbound] - [%s] - Exception occurred on method _CreateDefaultRuleInbound', body,  null);
                        return reject(false);
                    } else {
                        return resolve(JSON.parse(body).Result);
                    }
                })
            } catch (ex) {
                logger.error('[DVP-TwilioHandler._CreateDefaultRuleInbound] - [%s] - Exception occurred on method _CreateDefaultRuleInbound', null,  ex);
                return reject(ex);
            }
        });
    }

    async _CreateOriginatingURL(trunkSid, phoneNumber) {

        return client.trunking.trunks(trunkSid).originationUrls.create(
            {
                friendlyName: 'Facetone_' + trunkSid,
                trunkSid: trunkSid,
                sipUrl: 'sip:' + phoneNumber + '@' + config.Services.callServerIP + ':' + config.Services.callServerPort,
                priority: 0,
                weight: 1,
                enabled: true
            },
        );

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
                result.sort((a, b) => (a.country > b.country) ? 1 : -1);

            jsonString = messageFormatter.FormatMessage(undefined, "Countries retrieved successfully", true, result);
            return res.end(jsonString);
            }
        )
            .catch(error => {
                console.log(error);
                jsonString = messageFormatter.FormatMessage(error, "Error occurred when retrieving countries", false);
                return res.end(jsonString);
            })
    };

    async GetLocalPhoneNumbersByCountry(req, res) {
        let jsonString;
        let country = req.params.country;

        let numberPrice;
        try {
            numberPrice = await this._NumberPrice(country, 'local');
        } catch (e) {
            jsonString = messageFormatter.FormatMessage(e, "No Local phone numbers found for searched country", false);
            return res.end(jsonString);
        }


        client.availablePhoneNumbers(country).local.list({pageNumber: 1, pageSize: 10})
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
                return res.end(jsonString);
            })
            .catch(error => {
                jsonString = messageFormatter.FormatMessage(error, "No Local phone numbers found for searched country", false);
                return res.end(jsonString);
            })
    }

    async GetTollFreePhoneNumbersByCountry(req, res) {
        let jsonString;
        let country = req.params.country;

        let numberPrice;
        try {
            numberPrice = await this._NumberPrice(country, 'toll free');
        } catch (e) {
            jsonString = messageFormatter.FormatMessage(e, "No Toll Free phone numbers found for searched country", false);
            return res.end(jsonString);
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
                return res.end(jsonString);
            })
            .catch(error => {
                console.log(error);
                jsonString = messageFormatter.FormatMessage(error, "No toll-free phone numbers found for searched country", false);
                return res.end(jsonString);
            })
    }

    async GetMobilePhoneNumbersByCountry(req, res) {
        let jsonString;
        let country = req.params.country;

        let numberPrice;
        try {
            numberPrice = await this._NumberPrice(country, 'mobile');
        } catch (e) {
            jsonString = messageFormatter.FormatMessage(e, "No Mobile phone numbers found for searched country", false);
            return res.end(jsonString);
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
                return res.end(jsonString);
            })
            .catch(error => {
                jsonString = messageFormatter.FormatMessage(error, "No mobile phone numbers found for searched country", false);
                return res.end(jsonString);
            })
    }


    async BuyPhoneNumber(req, res) {
        let jsonString;
        let phoneNumber = req.body.number;
        let isoCountry = req.body.isoCountry;
        let numberType = req.body.numberType.toLowerCase();
        let company = parseInt(req.user.company);
        let tenant = parseInt(req.user.tenant);

        let availableCredit;
        try {
            let creditDetails = await this._CheckCredit(company, tenant);
            availableCredit = parseFloat(creditDetails.Credit)/100;

        }
        catch (e) {
            logger.error('[DVP-TwilioHandler._CheckCredit] - [%s] - Exception occurred on method _CheckCredit', null,  e);
            jsonString = messageFormatter.FormatMessage(e, "Error occurred when checking the available credit", false);
            return res.end(jsonString);

        }
        let phoneNumberRule;
        if (phoneNumber.indexOf('+') > -1) {
            phoneNumberRule = phoneNumber.replace('+', '');
        }
        try {
            await this._ValidatePhoneNumber(phoneNumber, isoCountry, numberType);
        } catch (e) {
            //logger.error('[DVP-Twilio.BuyPhoneNumber._ValidatePhoneNumber] - [%s] - [%s] - Error.', response, body, error);
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
                const account = await client.api.accounts.create({friendlyName: 'subaccount:' + company + ':' + tenant});

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
                jsonString = messageFormatter.FormatMessage(e, "Credit deduction from wallet failed", false);
                return res.end(jsonString);
            }

            let purchasedNumber;
            try {
                purchasedNumber = await client.incomingPhoneNumbers.create({ // purchase the number for the created subaccount
                    phoneNumber: phoneNumber,
                    accountSid: accSid,
                });
                console.log(purchasedNumber.sid);
            } catch (e) {
                jsonString = messageFormatter.FormatMessage(e, "Error occurred while purchasing the phone number", false);
                return res.end(jsonString);

            }

            let twilioTrunk;
            try {
                twilioTrunk = await client.trunking.trunks.list(); // get available trunks in twilio
                let trunkAssign = await client.trunking.trunks(twilioTrunk[0].sid).phoneNumbers.create(
                    {phoneNumberSid: purchasedNumber.sid}
                ); // assign phone number to twilio trunk assuming there exist only one trunk

            } catch (e) {
                jsonString = messageFormatter.FormatMessage(e, "Error occurred assigning phone number to trunk", false);
                return res.end(jsonString);
            }

            try {

                await this._AssignNumberToTrunk(tenant, company, phoneNumber, req.headers.authorization); // Assumed only one trunk exist which is already created

            } catch (e) {
                jsonString = messageFormatter.FormatMessage(e, "Phone number assignment to trunk failed", false);
                return res.end(jsonString);
            }

            // try {
            //
            //     await this._CreateOriginatingURL(twilioTrunk[0].sid, phoneNumber); // create originating URL for the phone number and callserver IP for incoming calls
            //
            // } catch (e) {
            //     jsonString = messageFormatter.FormatMessage(e, "Error occurred when creating the originating URL", false);
            //     return res.end(jsonString);
            // }

            try {

               await this._CreateDefaultRuleInbound(tenant, company, phoneNumberRule); // Default inbound rule

            } catch (e) {
                jsonString = messageFormatter.FormatMessage(e, "Default rule assignment failed", false);
                return res.end(jsonString);
            }

            jsonString = messageFormatter.FormatMessage(undefined, "Number purchased and configured successfully", true);
            return res.end(jsonString);
        }

    }
};

