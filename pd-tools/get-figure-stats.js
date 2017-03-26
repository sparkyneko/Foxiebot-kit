"use strict";

const http = require("http");

const versionControl = "<!--3\\.0.5-->";

const toId = function(text, id) {
    if (!text || typeof text !== "string") return "";
    if (id) return text.toLowerCase().replace(/[^a-z0-9\-]/g, "");
    return text.toLowerCase().replace(/[^a-z0-9]/g, "");
};

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

/**
 * searchAspect(aspect, html)
 * 
 * @aspect - string, the "name" of the specific stat being searched for
 * @html - the html of the page.
 * 
 * return stat {string}
 */
let searchAspect = function (aspect, html) {
    let regex = new RegExp("<b>" + aspect + "<\\/b>:.+?(<br \\/>|<\\/p>)");
    let match = html.match(regex);
    if (!match) return "";

    return match[0].replace(`<b>${aspect}</b>:`, "").replace(/(<br \/>|<\/p>)/, "").trim();
};

/**
 * getMonInformation(url)
 * 
 * @aspect - string, the destination page
 * 
 * return data {object} - contains all the stats of the specific figure.
 */
let getMonInformation = function (mon, id) {
    let url = `http://www.serebii.net/duel/figures/${id}-${toId(mon, true)}.shtml`;
    return new Promise((resolve, reject) => {
        getSiteData(url).then(html => {
            // remove extra spacing
            html = html.replace(/[\t\n]/g, "");

            // get individual data first
            let types = searchAspect("Type", html).split("/").map(p => p.trim());
            let rarity = searchAspect("Rarity", html);
            let mp = searchAspect("Movement", html);
            let ability = searchAspect("Special Ability", html).replace(/&eacute(?:\W)?/g, "é"); //  unescape html
            
            // now get the moves
            let moves = [];
            let movesTableRegex = new RegExp(versionControl + ".+?<\\/table>");
            let movesData = html.match(movesTableRegex);
            if (movesData) {
                let eachMove = movesData[0].match(/<tr>.+?<\/tr>/g);
                if (eachMove) {
                    eachMove.slice(1).forEach(m => {
                        let line = m.split(/<[^\>]+?>/);
                        moves.push({
                            size: line[2],
                            name: line[4],
                            id: toId(line[4]),
                            colour: line[6],
                            desc: (line[8] || "").replace(/&eacute(?:\W)?/g, "é"),
                            power: line[10] ? !/[^0-9]/i.test(line[10]) ? parseInt(line[10]) : line[10].replace(/&star(?:\W)?/g, "☆") : 0,
                        });
                    });
                }
            }
            
            resolve({
                mon: mon.replace("&#9794", "♂"),
                id: toId(mon),
                num: id,
                types: types,
                rarity: rarity,
                mp: mp,
                ability: ability,
                moves: moves,
            });
        }).catch(err => {
            reject(err);
        });
    });
};

module.exports = getMonInformation;
