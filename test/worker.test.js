"use strict";
var expect = require("chai").expect
var Worker = require("../worker")

var noop = function () {
}

describe("Worker", function () {
  it("should throw on missing func", function () {
    var f = function () {
      return new Worker(undefined, {queueUrl: "http://q"})
    }
    expect(f).to.throw()
  })

  it("should throw on missing required options", function () {
    var f = function () {
      return new Worker(noop)
    }
    expect(f).to.throw()
  })
})
