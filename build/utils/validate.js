/**
 * validate incoming data to meet minimum requirements
 *
 * @param {Object} data
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
function validateData(data) {
    if (!data) {
        throw new Error('no data provided');
    }

    if (!data.specs || !data.specs.length) {
        throw new Error('invalid data provided');
    }
}

exports['default'] = validateData;
module.exports = exports['default'];
