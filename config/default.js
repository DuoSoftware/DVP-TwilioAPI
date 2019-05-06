module.exports = {


    "Redis":
        {
            "mode":"sentinel",//instance, cluster, sentinel
            "ip": "138.197.90.92",
            "port": 6389,
            "user": "duo",
            "password": "DuoS123",
            "sentinels":{
                "hosts": "138.197.90.92,45.55.205.92,138.197.90.92",
                "port":16389,
                "name":"redis-cluster"
            }

        },


    "Security":
        {

            "ip" : "45.55.142.207",
            "port": 6389,
            "user": "duo",
            "password": "DuoS123",
            "mode":"sentinel",//instance, cluster, sentinel
            "sentinels":{
                "hosts": "138.197.90.92,45.55.205.92,138.197.90.92",
                "port":16389,
                "name":"redis-cluster"
            }
        },

    "Host":
        {
            "profilesearch":"secondary",
            "resource": "cluster",
            "vdomain": "localhost",
            "domain": "localhost",
            "port": "3639",
            "version": "1.0.0.0"
        },

    "LBServer" : {

        "ip": "localhost",
        "port": "3434"

    },

    "Mongo":
        {
            "ip":"104.236.231.11",
            "port":"27017",
            "dbname":"dvpdb",
            "password":"DuoS123",
            "user":"duo",
            "replicaset" :""
        },

    "Services" : {
        "accessToken":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiYWEzOGRmZWYtNDFhOC00MWUyLTgwMzktOTJjZTY0YjM4ZDFmIiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE5MDIzODExMTgsInRlbmFudCI6LTEsImNvbXBhbnkiOi0xLCJzY29wZSI6W3sicmVzb3VyY2UiOiJhbGwiLCJhY3Rpb25zIjoiYWxsIn1dLCJpYXQiOjE0NzAzODExMTh9.Gmlu00Uj66Fzts-w6qEwNUz46XYGzE8wHUhAJOFtiRo",
        "authTokenTwilio": '',
        "accountSidTwilio": '',
        "ruleserviceHost": "ruleservice.app.veery.cloud",
        "ruleservicePort": "1111",
        "ruleserviceVersion": "1.0.0.0",
        "billingserviceHost": "billingservice.app.veery.cloud",
        "billingservicePort": "4444",
        "billingserviceVersion": "1.0.0.0",
        "walletserviceHost": "104.236.197.119",
        "walletservicePort": "3333",
        "walletserviceVersion": "1.0.0.0",
        "trunkServiceHost": "phonenumbertrunkservice.app1.veery.cloud",
        "trunkServicePort": "8818",
        "trunkServiceVersion": "1.0.0.0",
        "callServerIP": "159.203.160.47",
        "callServerPort": "5080"
    },

    "Tenant": {
        "activeTenant": 1,
        "activeCompany": 0
    },

    "Operator": "TWILIO",
    "TrunkID": 41

};
