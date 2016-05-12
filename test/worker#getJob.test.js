"use strict";
var nock = require("nock")
var sinon = require("sinon")
var Worker = require("../worker")

describe("worker#getJob", function () {
  var worker
  beforeEach(function () {
    nock.disableNetConnect()

    worker = new Worker(sinon.stub(), {
      queueUrl: "http://q",
      serverUrl: "http://srv"
    })
    worker.activeMsg = {MessageId: "id"}
    sinon.spy(worker, "_updateJob")
  })

  afterEach(function () {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  it("should GET /jobs/:id", function () {
    var srv = nock("http://srv/jobs")
      .get("/id")
      .reply(200, {
        canceled: false
      })

    return worker.getJob()
      .then(function () {
        srv.done()
      })
  })
})
