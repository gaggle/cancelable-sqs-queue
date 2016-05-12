"use strict";
var expect = require("chai").expect
var low = require("lowdb")
var rewire = require("rewire")

describe("db", function () {
  var db
  beforeEach(function () {
    db = rewire("../lib/db")
    db.__set__("db", low("./path", {
      storage: {
        write: function () {
          // noop
        }
      }
    }))
  })

  describe("#create", function () {
    it("should resolve to entry", function () {
      return db.create({MessageId: "foo"})
        .then(function (result) {
          expect(result).to.have.length(1)
          expect(result[0]).to.contain({MessageId: "foo"})
        })
    })
  })

  describe("#read", function () {
    it("should resolve to entry", function () {
      return db.create({MessageId: "foo"})
        .then(function () {
          return db.read("foo")
        })
        .then(function (result) {
          expect(result).to.contain({MessageId: "foo"})
        })
    })

    it("should reject if not found", function () {
      return db.read("doesntexist")
        .catch(function (err) {
          expect(err).to.be.an("Error")
        })
    })
  })

  describe("#readAll", function () {
    it("should resolve no entries to empty array", function () {
      return db.readAll()
        .then(function (result) {
          expect(result).to.eql([])
        })
    })

    it("should resolve to entries", function () {
      return db.create({MessageId: "foo"})
        .then(function () {
          return db.create({MessageId: "bar"})
        })
        .then(function () {
          return db.readAll()
        })
        .then(function (result) {
          expect(result).to.have.length(2)
          expect(result[0]).to.contain({MessageId: "foo"})
          expect(result[1]).to.contain({MessageId: "bar"})
        })
    })
  })

  describe("#update", function () {
    it("should resolve to updated entry", function () {
      return db.create({MessageId: "foo"})
        .then(function () {
          return db.update("foo", {hi: "hallo"})
        })
        .then(function (result) {
          expect(result).to.contain({MessageId: "foo", hi: "hallo"})
        })
    })

    it("should reject if not found", function () {
      return db.update("doesntexist")
        .catch(function (err) {
          expect(err).to.be.an("Error")
        })
    })
  })

  describe("#drop", function () {
    it("should resolve with count of deleted items", function () {
      return db.create({foo: "bar"})
        .then(function () {
          return db.drop()
        })
        .then(function (result) {
          expect(result).to.eql(1)
        })
    })

    it("should delete all entries", function () {
      return db.create({foo: "bar"})
        .then(function () {
          return db.drop()
        })
        .then(function () {
          return db.readAll()
        })
        .then(function (result) {
          expect(result).is.empty
        })
    })
  })
})
