/*jshint esversion: 6 */

const socketTimeout = 30000;
var configuration = getConfiguration();

checkWebServers();

function checkWebServers() {
    var servers = configuration.servers;

    var keys = Object.keys(servers);

    for (let index = 0; index < keys.length; index++) {
        const serverId = keys[index];
        var server = servers[serverId];

        checkWebServer(server);
    }
}

function getConfiguration() {
    var fs = require("fs");
    var configuration = JSON.parse(fs.readFileSync("servers.json", "utf8"));

    return configuration;
}

function checkWebServer(server) {
    const https = require("http");
    const errorMessage = "Error WebServer is down: ";

    var url = getBaseUrl(server) + server.webserver;

    var request = https
        .get(url, resp => {
            let data = "";

            // A chunk of data has been recieved.
            resp.on("data", chunk => {
                data += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on("end", () => {
                console.log("Success WebServer: " + server.name);
                checkAppServer(server);
            });
        })
        .on("error", err => {
            var body = "Error on: " + url;
            body += "\n" + "\nDescription: " + err.message;

            console.log(errorMessage + url + " " + err.message);
            sendMail(errorMessage + server.name, body);
        });
        
    request.on('socket', (socket) => {
        socket.setTimeout(socketTimeout);
        socket.on('timeout', function () {
            request.abort();
            //console.log("Timeout " + url);
        });
    });
}

function getBaseUrl(server) {
    var url = server.protocol + "://" + server.host + ":" + server.port + "/";
    return url;
}

function sendMail(subject, text) {

    var email = configuration.email;
    var nodemailer = require("nodemailer");

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    var transporter = nodemailer.createTransport({
        host: "mail.meta4.com",
        port: 25,
        secure: false
    });

    var mailOptions = {
        from: "DevOps@meta4.com",
        to: email,
        subject: subject,
        text: text
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log("Email sent: " + info.response);
        }
    });
}

function checkAppServer(server) {
    const https = require("http");
    const errorMessage = "Error AppServer is down: ";

    if (server.appserver) {

        var baseUrl = getBaseUrl(server);
        var url = baseUrl + server.appserver;

        url += "?user=" + server.user;
        url += "&pass=" + server.pass;
        url += "&host=" + server.host;
        url += "&port=" + server.port;

        var request = https
            .get(url, resp => {
                let data = "";

                // A chunk of data has been recieved.
                resp.on("data", chunk => {
                    data += chunk;
                });

                // The whole response has been received. Print out the result.
                resp.on("end", () => {
                    //console.log(JSON.parse(data));
                    //console.log(data);
                    var response;
                    var body = "";

                    try {
                        response = JSON.parse(data);
                    } catch (e) {
                        response = null;
                        console.log("Error AppServer: " + server.name);
                        console.log(errorMessage + data);
                        body = data;

                        sendMail(errorMessage + server.name, body);
                    }

                    if (response) {
                        //console.log("response.bLogonOK: " + response.bLogonOK);
                        if (response.bLogonOK === "true") {
                            console.log("Success AppServer: " + server.name);
                        } else {
                            console.log("Error AppServer: " + server.name);
                            body = "Error on: " + baseUrl;
                            sendMail(errorMessage + server.name, body);
                        }
                    }
                });
            })
            .on("error", err => {
                var body = "Error on: " + baseUrl;
                body += "\n" + err.message;
                console.log("Error AppServer: " + server.name);
                console.log(errorMessage + url + " " + err.message);
                sendMail(errorMessage + server.name, body);
            });

        request.on('socket', (socket) => {
            socket.setTimeout(socketTimeout);
            socket.on('timeout', function () {
                request.abort();
            });
        });
    }
}





