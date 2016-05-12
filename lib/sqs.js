"use strict";
var AWS = require("aws-sdk")
var Q = require("q")

var sqs = new AWS.SQS({region: "eu-west-1"})

exports.send = function (msg, url) {
  var params = {
    MessageBody: msg,
    QueueUrl: url
  }

  return Q.Promise(function (resolve, reject) {
    sqs.sendMessage(params, function (err, data) {
      if (err) reject(err)
      else resolve(data)
    })
  })
}
