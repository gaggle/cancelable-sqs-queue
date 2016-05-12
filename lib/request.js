"use strict";
var Q = require("q")
var rp = require("request-promise")

exports.get = function (uri) {
  var options = {
    uri: uri,
    json: true
  }
  return Q(rp(options))
}

exports.put = function (uri, body) {
  var options = {
    method: "PUT",
    uri: uri,
    body: body,
    json: true
  }
  return Q(rp(options))
}

exports.post = function (uri, body) {
  var options = {
    method: "POST",
    uri: uri,
    body: body,
    json: true
  }
  return Q(rp(options))
}
