'use strict';

var Potrace = require('./Potrace');
var Posterizer = require('./Posterizer');

/**
 * Wrapper for Potrace that simplifies use down to one function call
 *
 * @param {Buffer} file Source image
 * @param {Number} w Image width
 * @param {Number} h Image height
 * @param {Potrace~Options} [options]
 * @returns {string} SVG
 */
function trace(file, w, h, options) {
  if (arguments.length === 2) {
    cb = options;
    options = {};
  }

  var potrace = new Potrace(options);

  potrace.loadImage(file, w, h);

  return potrace.getSVG();
}

/**
 * Wrapper for Potrace that simplifies use down to one function call
 *
 * @param {Buffer} file Source image
 * @param {Number} w Image width
 * @param {Number} h Image height
 * @param {Posterizer~Options} [options]
 * @returns {string} SVG
 */
function posterize(file, w, h, options) {
  if (arguments.length === 2) {
    cb = options;
    options = {};
  }

  var posterizer = new Posterizer(options);

  posterizer.loadImage(file, w, h);

  return posterizer.getSVG();
}

module.exports = {
  trace: trace,
  posterize: posterize
};