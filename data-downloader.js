/**
 * This file downloads raw data from Pokemon Showdown's GitHub
 * 
 */

"use strict";

const https = require("https");
const fs = require("fs");

const baseUrl = "https://raw.githubusercontent.com/Zarel/Pokemon-Showdown/master/data/"
const files = ["pokedex", "formats-data", "items", "moves", "abilities"];

function download (key) {
    return new Promise((resolve, reject) => {
        let link = baseUrl + key + ".js";
        https.get(link, res => {
            let data = '';
            res.on('data', function(part) {
                data += part;
            });
            res.on('end', () => {
                fs.writeFile("data/" + key + ".js", data, err => {
                    if (err) reject();
                    else resolve();
                });
            });
        });
    });
}

function checkFiles() {
    return new Promise((resolve, reject) => {
        fs.readdir("data", (err, dir) => {
            if (err) return resolve(true);
            if (files.some(f => !dir.includes(f + '.js'))) return resolve(true);
            resolve(false);
        })
    });
}

function downloadAll(forceDownload) {
    return new Promise((resolve, reject) => {
        checkFiles().then(reqDownload => {
            if (!reqDownload && !forceDownload) return resolve();
            console.log("Starting download of files.");
            Promise.all(
                    files.map(key => download(key))
                )
                .then(() => {
                    console.log("Completed download.");
                    resolve();
                })
                .catch(err => reject(err));
        }).catch(err => reject(err));
    });
}

module.exports = downloadAll;