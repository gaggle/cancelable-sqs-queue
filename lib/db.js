"use strict";
var _ = require("lodash")
var low = require("lowdb")
  , storage = require("lowdb/file-async")
var Q = require("q")

var TIMESTAMP = {created: "_createdAt", updated: "_updatedAt"}
var INVARIABLES = ["MessageId", "_createdAt"]
var BLACKLIST = ["_links"]
var db = low("./db.json", {storage: storage})

var prune = function (d) {
  var keep = _.pick(d, INVARIABLES)
  var pruned = _.omit(d, BLACKLIST)
  return _.merge(pruned, keep)
}

exports.create = function (raw_data) {
  var data = prune(raw_data)
  data[TIMESTAMP.created] = Date.now()
  data[TIMESTAMP.updated] = Date.now()

  return Q.when(db("jobs").push(data))
}

exports.read = function (id) {
  var needle = {MessageId: id}
  return Q.when(db("jobs")
    .find(needle))
    .then(function (job) {
      if (!job) throw new Error("No match for " + JSON.stringify(needle))
      return job
    })
}

exports.readAll = function () {
  return Q.when(db("jobs").value())
}

exports.update = function (id, raw_data) {
  var needle = {MessageId: id};
  return exports.read(id) // Early reject in case resource doesn't exist
    .thenResolve(prune(raw_data))
    .then(function (data) {
      data[TIMESTAMP.updated] = Date.now()
      return data
    })
    .then(function (data) {
      return db("jobs").chain()
        .find(needle)
        .assign(data)
        .value()
    })
}

exports.drop = function () {
  var n = db("jobs").size()
  delete db.object.jobs
  db.write()
  return n
}
