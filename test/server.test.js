"use strict";
var expect = require("chai").expect
var Q = require("q")
var rewire = require("rewire")
var sinon = require("sinon")
var request = require("supertest")

var URL = "http://q"

describe("Server", function () {
  var app, sandbox, Server
  beforeEach(function () {
    Server = rewire("../server")
    sandbox = sinon.sandbox.create()

    sandbox.db = sandbox.stub(Server.__get__("db"))
    Server.__set__("db", sandbox.db)

    sandbox.sqs = sandbox.stub(Server.__get__("sqs"))
    Server.__set__("sqs", sandbox.sqs)

    app = new Server({queueUrl: URL, logLevel: "error"})
  })

  afterEach(function () {
    sandbox.restore()
  })

  it("should throw on naked call", function () {
    var f = function () {
      return new Server()
    }
    expect(f).to.throw()
  })

  describe("GET /jobs", function () {
    it("should 200", function (done) {
      sandbox.db.readAll.returns(Q.resolve([{MessageId: "foo"}]))
      request(app)
        .get("/jobs")
        .expect(function (res) {
          sinon.assert.calledOnce(sandbox.db.readAll)
          var ideal = {
            "_embedded": {
              "jobs": [
                {"MessageId": "foo", "_links": {"self": {"href": "/jobs/foo"}}}
              ]
            },
            "_links": {"self": {"href": "/jobs"}},
            "count": 1
          }
          expect(res.body).to.eql(ideal)
        })
        .expect(200, done)
    })
  })

  describe("POST /jobs", function () {
    [undefined, {}].forEach(function (el) {
      it("should 200 with " + JSON.stringify(el) + " body", function (done) {
        var msg = {
          MessageId: "foo",
          MD5OfMessageBody: "bar",
          MD5OfMessageAttributes: "baz"
        }
        sandbox.sqs.send.returns(Q.resolve(msg))
        sandbox.db.create.returns(Q.resolve(msg))

        request(app)
          .post("/jobs")
          .send(el)
          .expect(function (res) {
            sinon.assert.calledOnce(sandbox.sqs.send)
            sinon.assert.calledWith(sandbox.sqs.send, '{}', URL)
            sinon.assert.calledOnce(sandbox.db.create)
            sinon.assert.calledWith(sandbox.db.create, msg)
            var ideal = {
              "MD5OfMessageAttributes": "baz",
              "MD5OfMessageBody": "bar",
              "MessageId": "foo",
              "_links": {
                "self": {
                  "href": "/jobs/foo"
                }
              }
            }
            expect(res.body).to.eql(ideal)
          })
          .expect(200, done)
      })
    })

    it("should 200 with data in body", function (done) {
      var msg = {
        MessageId: "foo",
        MD5OfMessageBody: "bar",
        MD5OfMessageAttributes: "baz"
      }
      sandbox.sqs.send.returns(Q.resolve(msg))
      sandbox.db.create.returns(Q.resolve(msg))

      request(app)
        .post("/jobs")
        .send({ham: "spam"})
        .expect(function (res) {
          sinon.assert.calledOnce(sandbox.sqs.send)
          sinon.assert.calledWith(sandbox.sqs.send, '{"ham":"spam"}', URL)
          sinon.assert.calledOnce(sandbox.db.create)
          sinon.assert.calledWith(sandbox.db.create, msg)
          var ideal = {
            "MD5OfMessageAttributes": "baz",
            "MD5OfMessageBody": "bar",
            "MessageId": "foo",
            "_links": {
              "self": {
                "href": "/jobs/foo"
              }
            }
          }
          expect(res.body).to.eql(ideal)
        })
        .expect(200, done)
    })
  })

  describe("DEL /jobs", function () {
    it("should 200", function (done) {
      sandbox.db.drop.returns(Q.resolve(1))
      request(app)
        .del("/jobs")
        .expect(function (res) {
          sinon.assert.calledOnce(sandbox.db.drop)
          var ideal = {
            "_links": {"self": {"href": "/jobs"}},
            count: 1
          }
          expect(res.body).to.eql(ideal)
        })
        .expect(200, done)
    })
  })

  describe("GET /jobs/:id", function () {
    it("should 400 on undefined id", function (done) {
      request(app)
        .get("/jobs/")
        .expect(400, done)
    })

    it("should 404 if id doesn't exist", function (done) {
      sandbox.db.read.returns(Q.reject(new Error()))
      request(app)
        .get("/jobs/foo")
        .expect(function () {
          sinon.assert.calledOnce(sandbox.db.read)
          sinon.assert.calledWith(sandbox.db.read, "foo")
        })
        .expect(404, done)
    })

    it("should 200", function (done) {
      sandbox.db.read.returns(Q.resolve({
        MessageId: "foo",
        MD5OfMessageBody: "bar",
        MD5OfMessageAttributes: "baz"
      }))
      request(app)
        .get("/jobs/foo")
        .expect(function (res) {
          sinon.assert.calledOnce(sandbox.db.read)
          sinon.assert.calledWith(sandbox.db.read, "foo")
          expect(res.body).to.eql({
            "MD5OfMessageAttributes": "baz",
            "MD5OfMessageBody": "bar",
            "MessageId": "foo",
            "_links": {
              "self": {
                "href": "/jobs/foo"
              }
            }
          })
        })
        .expect(200, done)
    })
  })

  describe("PUT /jobs/:id", function () {
    it("should 400 on undefined id", function (done) {
      request(app)
        .put("/jobs/")
        .expect(400, done)
    })

    it("should 400 on undefined body", function (done) {
      request(app)
        .put("/jobs/foo")
        .expect(400, done)
    })

    it("should 400 on empty body", function (done) {
      request(app)
        .put("/jobs/foo")
        .send({})
        .expect(400, done)
    })

    it("should 404 if id doesn't exist", function (done) {
      sandbox.db.update.returns(Q.reject(new Error()))
      request(app)
        .put("/jobs/foo")
        .send({ham: "spam"})
        .expect(function () {
          sinon.assert.calledOnce(sandbox.db.update)
          sinon.assert.calledWith(sandbox.db.update, "foo", {ham: "spam"})
        })
        .expect(404, done)
    })

    it("should 200", function (done) {
      sandbox.db.update.returns(Q.resolve({
        MessageId: "foo",
        MD5OfMessageBody: "bar",
        MD5OfMessageAttributes: "baz",
        ham: "spam"
      }))
      request(app)
        .put("/jobs/foo")
        .send({ham: "spam"})
        .expect(function (res) {
          sinon.assert.calledOnce(sandbox.db.update)
          sinon.assert.calledWith(sandbox.db.update, "foo", {ham: "spam"})
          expect(res.body).to.eql({
            "MD5OfMessageAttributes": "baz",
            "MD5OfMessageBody": "bar",
            "MessageId": "foo",
            "ham": "spam",
            "_links": {
              "self": {
                "href": "/jobs/foo"
              }
            }
          })
        })
        .expect(200, done)
    })
  })
})
