"use strict";

const download = require("./get-figure-stats");
const http = require("http");

let getSiteData = function (url) {
    return new Promise((resolve, reject) => {
        http.get(url, res => {
            let data = '';
            res.on('data', part => {
                data += part;
            });
            res.on('error', err => {
                reject(err);
            });
            res.on('end', end => {
                resolve(data);
            });
        });
    });
};
let downloadData = function (delay) {
    delay = parseInt(delay);
    if (!delay || delay < 0) delay = 0;
    return new Promise((resolve, reject) => {
        getSiteData("http://www.serebii.net/duel/figures.shtml").then(html => {
            // clean up html first
            html = html.replace(/[\t\n]/g, "");

            let Promises = [];
            let results = {};

            // identify the table with all the listings
            let match1 = html.match(/<table class="dextable" align="center">.+?<\/table>/);
            if (match1) {
                // identify each listing
                let match2 = match1[0].match(/<tr>.+?<\/tr>/g);
                if (match2) {
                    match2.slice(1).forEach(m => {
                        let parts = m.split(/<[^\>]+?>/);
                        let id = parts[2].slice(5);
                        let mon = parts[11];
                        Promises.push([mon, id]);
                    });
                    let count = 0;
                    
                    // since Serebii thinks using Promise.all is a DDoS storm, 
                    // we'll have to take lots of time and do them one at a time
                    function runDownload() {
                        download(...Promises[count++]).then(data => {
                            let baseid = data.id;
                            let id = baseid;
                            let idcount = 2;
                            while (results[id]) {
                                id = baseid + idcount;
                                data.id = id;
                                idcount++;
                            }
                            results[id] = data;
                            if (count >= Promises.length) {
                                return resolve(results);
                            } else {
                              setTimeout(() => runDownload(), delay);
                            }
                        });
                    }
                    runDownload();
                }
            }
        }).catch(err => {
            reject(err);
        });
    });
};

module.exports = downloadData;
