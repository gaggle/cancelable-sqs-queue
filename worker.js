"use strict";
var _ = require("lodash")
var log = require("loglevel")
var ce = require("node-custom-errors")
var Consumer = require("sqs-consumer")
var request = require("./lib/request")

const STATUS = {
  cancel: "cancel",
  failure: "failure",
  pending: "pending",
  success: "success"
}

var CanceledError = ce.create("CanceledError")
var DoesntExistError = ce.create("DoesntExistError")

var Worker = function (func, opts) {
  this.opts = opts || {}
  if (!func)
    throw new Error("Must specify func")
  this.func = func

  if (!this.opts.queueUrl)
    throw new Error("Must specify queueUrl")
  if (!this.opts.serverUrl)
    throw new Error("Must specify serverUrl")
  if (!this.opts.logLevel)
    this.opts.logLevel = "info"
  this.log = log

  this.url = this.opts.serverUrl
  log.setLevel(this.opts.logLevel)

  this.activeMsg = null

  return this
}

Worker.prototype.cancelCheck = function () {
  var self = this
  var id = self.activeMsg.MessageId
  log.debug("[Worker#cancelCheck] Checking if job %s is canceled", id)
  return self.getJob(id)
    .then(
      function (job) {
        if (job.canceled == true) {
          log.debug("[Worker#cancelCheck] Job %s is canceled", id)
          throw new CanceledError(id)
        }
      },
      function (err) {
        if (err.statusCode == 404) {
          log.debug("[Worker#cancelCheck] Job %s doesn't exist", id)
          throw new DoesntExistError(id)
        }
        throw err
      })
}

Worker.prototype.listen = function () {
  var self = this
  var app = Consumer.create({
    queueUrl: self.opts.queueUrl,
    handleMessage: function (msg, done) {
      log.info("[Worker] Processing message:", msg)
      self.activeMsg = msg
      return self._processMsg()
        .finally(function () {
          self.activeMsg = null
          done()
          log.debug("[Worker] Done processing message")
        })
        .done()
    }
  })

  app.on("error", function (err) {
    console.error("Fatal error:", err)
    app.stop()
  })

  app.start()
}

Worker.prototype.getJob = function () {
  var self = this
  var uri = self.opts.serverUrl + "/jobs/" + self.activeMsg.MessageId
  log.debug("[Worker#getJob] GET", uri)
  return request.get(uri)
    .tap(function (res) {
      log.debug("[Worker#getJob] Result of GET:", res)
    })
}

Worker.prototype.updateJob = function (data) {
  if (data.canceled) throw new Error("Reserved property 'canceled'")
  if (data.error) throw new Error("Reserved property 'error'")
  if (data.id) throw new Error("Reserved property 'id'")
  if (data.result) throw new Error("Reserved property 'result'")
  if (data.status) throw new Error("Reserved property 'status'")
  return this._updateJob(data)
}

Worker.prototype._processMsg = function () {
  var self = this
  log.debug("[Worker#_process] Processing:", self.activeMsg)
  return self.cancelCheck()
    .then(function () {
      log.debug("[Worker#_process] Setting status pending")
      return self._updateJob({status: STATUS.pending})
    })
    .then(function () {
      log.debug("[Worker#_process] Running function")
      return self.func.bind(self)(self.activeMsg)
    })
    .then(function (result) {
      log.debug("[Worker#_process] Ran function, result:", result)
      log.debug("[Worker#_process] Setting status success")
      return self._updateJob({status: STATUS.success, result: result})
    })
    .catch(function (err) {
      var data = {}
      var id = self.activeMsg.MessageId
      if (err instanceof DoesntExistError) {
        log.debug("[Worker#_process] Job %s doesn't exist", id)
        return
      }

      if (err instanceof CanceledError) {
        log.debug("[Worker#_process] Job %s was canceled", id)
        data.status = STATUS.cancel
      } else {
        log.warn("[Worker#_process] Error running function:", err)
        data.status = STATUS.failure
        data.error = {message: err.message, stack: err.stack, raw: err}
      }
      log.debug("[Worker#_process] Setting non-success status:", data)
      return self._updateJob(data)
    })
}

Worker.prototype._updateJob = function (data) {
  var self = this
  var id = self.activeMsg.MessageId
  var uri = self.opts.serverUrl + "/jobs/" + id
  log.debug("[Worker#_updateJob] Updating %s with:", id, data)
  return this.getJob()
    .then(function (job) {
      var body = _.merge(job, data)
      log.debug("[Worker#_updateJob] PUT", uri, body)
      return request.put(uri, body)
    })
    .tap(function (res) {
      log.debug("[Worker#_updateJob] Result of PUT:", res)
    })
}

module.exports = Worker
