"use strict";
var hal = require("hal")
var _ = require("lodash")
var log = require("loglevel")
var restify = require("restify")
var db = require("./lib/db")
var sqs = require("./lib/sqs")
var packagejson = require("./package.json")

var createServer = function (opts) {
  opts = opts || {}
  if (!opts.queueUrl)
    throw new Error("Must specify queueUrl")
  if (!opts.logLevel)
    opts.logLevel = "info"

  log.setLevel(opts.logLevel)

  var app = restify.createServer({
    name: packagejson.name,
    version: packagejson.version
  })

  app.use(restify.bodyParser())

  app.use(function (req, res, next) {
    logRequest(req)
    next()
  })

  app.get("/jobs", function (req, res, next) {
    db.readAll()
      .then(function (jobs) {
        log.debug("[GET /jobs] Got", jobs.length, "jobs")
        res.send(jobsCollection(jobs).toJSON())
      })
      .then(next)
      .catch(next)
      .done()
  })

  app.post("/jobs", function (req, res, next) {
    if (!req.body)
      req.body = {}
    log.debug("[POST /jobs] Creating message with data:", req.body)
    sqs.send(JSON.stringify(req.body), opts.queueUrl)
      .then(function (msg) {
        log.debug("[POST /jobs] Created message:", msg)
        return db.create(msg)
          .thenResolve(msg) // db.create returns all objects!
      })
      .then(function (entry) {
        log.debug("[POST /jobs] Created db entry:", entry)
        res.send(jobResource(entry).toJSON())
      })
      .then(next)
      .catch(next)
      .done()
  })

  app.del("jobs/", function (req, res, next) {
    db.drop()
      .then(function (count) {
        log.debug("[DEL /jobs] Dropped", count, "jobs")
        res.send(new hal.Resource({count: count}, "/jobs").toJSON())
      })
      .then(next)
      .catch(next)
      .done()
  })

  app.get("jobs/:MessageId", function (req, res, next) {
    if (!(_.get(req, "params.MessageId")))
      return next(new restify.InvalidContentError("No resource specified"))

    db.read(req.params.MessageId)
      .then(
        function (job) {
          log.debug("[GET /jobs/:id] Got db entry", req.params.MessageId, job)
          res.send(jobResource(job).toJSON())
        },
        function () {
          throw new restify.ResourceNotFoundError(req.params.MessageId)
        })
      .then(next)
      .catch(next)
      .done()
  })

  app.put("jobs/:MessageId", function (req, res, next) {
    if (!(_.get(req, "params.MessageId")))
      return next(new restify.InvalidContentError("No resource specified"))

    if (_.isEmpty(req.body))
      return next(new restify.InvalidContentError("No body specified"))

    db.update(req.params.MessageId, req.body)
      .then(
        function (job) {
          log.debug("[PUT /jobs/:id] Updated db entry", req.params.MessageId, job)
          res.send(jobResource(job).toJSON())
        },
        function () {
          throw new restify.ResourceNotFoundError(req.params.MessageId)
        })
      .then(next)
      .catch(next)
      .done()
  })

  return app
}

var jobsCollection = function (jobs) {
  var collection = new hal.Resource({count: jobs.length}, "/jobs")
  collection.embed("jobs", jobs.map(jobResource))
  return collection
}

var jobResource = function (job) {
  return new hal.Resource(job, "/jobs/" + job.MessageId)
}

var logRequest = function (req) {
  if (log.getLevel() <= log.levels.INFO) {
    var info = [req.method.toUpperCase(), req.url]
    if (log.getLevel() <= log.levels.DEBUG) {
      if (req.params)
        info.push("| params:", req.params)
      if (req.body)
        info.push("| body: ", req.body)
    }
    log.info.apply(this, info)
  }
}

module.exports = createServer
