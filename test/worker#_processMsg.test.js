"use strict";
var nock = require("nock")
var Q = require("q")
var sinon = require("sinon")
var Worker = require("../worker")

describe("worker#_processMsg", function () {
  var worker
  beforeEach(function () {
    nock.disableNetConnect()

    worker = new Worker(sinon.stub(), {
      queueUrl: "http://q",
      serverUrl: "http://srv",
      logLevel: "error"
    })
    worker.activeMsg = {MessageId: "foo"}
    sinon.spy(worker, "_updateJob")
  })

  afterEach(function () {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  describe("with canceled msg", function () {
    var srv
    beforeEach(function () {
      srv = nock("http://srv/jobs")
        .get("/foo")
        .reply(200, {canceled: true})
        .get("/foo")
        .reply(200, {canceled: true})
        .put("/foo")
        .reply(200, {canceled: true, status: "cancel"})
    })

    afterEach(function () {
      srv.done()
    })

    it("should not invoke function", function () {
      return worker._processMsg()
        .then(function () {
          sinon.assert.notCalled(worker.func)
        })
    })

    it("should set status", function () {
      return worker._processMsg()
        .then(function () {
          sinon.assert.calledWith(worker._updateJob, sinon.match({status: "cancel"}))
        })
    })
  })

  describe("with msg", function () {
    var srv
    beforeEach(function () {
      srv = nock("http://srv/jobs")
        .get("/foo")
        .reply(200, {})
        .get("/foo")
        .reply(200, {})
        .put("/foo")
        .reply(200, {status: "pending"})
        .get("/foo")
        .reply(200, {status: "pending"})
        .put("/foo")
        .reply(200, {status: "success"})
    })

    afterEach(function () {
      srv.done()
    })

    it("should call function", function () {
      return worker._processMsg()
        .then(function () {
          sinon.assert.calledOnce(worker.func)
        })
    })

    it("should always set pending status", function () {
      return worker._processMsg()
        .then(function () {
          sinon.assert.calledWith(worker._updateJob, {status: "pending"})
        })
    })

    it("should set success status on func resolve", function () {
      return worker._processMsg()
        .then(function () {
          sinon.assert.calledWith(worker._updateJob, sinon.match({status: "success"}))
        })
    })

    it("should set error status if func rejects", function () {
      worker.func.returns(Q.reject(new Error("Ut oh")))
      return worker._processMsg()
        .then(function () {
          sinon.assert.calledWith(worker._updateJob, sinon.match({status: "failure"}))
        })
    })

    it("should set error status if func throws", function () {
      worker.func.throws(new Error("This isn't even a promise!"))
      return worker._processMsg()
        .then(function () {
          sinon.assert.calledWith(worker._updateJob, sinon.match({status: "failure"}))
        })
    })
  })
})
