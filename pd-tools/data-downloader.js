const download = require("./get-figures");
const beautify = require('js-beautify').js_beautify;
const fs = require("fs");

function runDownload(delay) {
    return new Promise((resolve, reject) => {
        download(delay).then(json => {
            fs.writeFileSync("pd-tools/figures.js", '"use strict";\n\nmodule.exports = ' + beautify(JSON.stringify(json), {
                indent_size: 2
            }) + ";");
            resolve(Object.keys(json).length);
        }).catch(err => {
            console.log(err);
            reject(err);
        });
    });
}

module.exports = runDownload;