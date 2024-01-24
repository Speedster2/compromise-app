"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explode = void 0;
function explode(promise, callback) {
    let resolve, reject;
    promise
        .then((res) => {
        resolve = res;
    })
        .catch((rej) => {
        reject = rej;
    })
        .finally(() => {
        callback(resolve, reject);
    });
}
exports.explode = explode;
