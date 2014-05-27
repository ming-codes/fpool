
var chai = require('chai')
var sinon = require('sinon')
var Promise = require('promise')
var lib = '../lib'

chai.should()
chai.use(require('sinon-chai'))

var ready = require('../lib/mq')

describe('Message Queue', function() {
  it('should export a single function that takes a single param', function() {
    ready.should.a('function')
    ready.length.should.equal(1)
  })

  describe('Message Queue supports 3 call styles', function() {
    describe('callback: invoke callback function with signature (err, data) when done', function() {
      it('should pass data back', sinon.test(function(done) {
        var addListener = this.stub(process, 'on').callsArg(1)
          , clock = this.clock
          , send

        process.send = function() {
          if (done) { done(); done = null }
        }

        send = this.spy(process, 'send')

        ready(function(job, callback) {
          setImmediate(function() {
            callback(null, 'payload')

            send.should.be.calledTwice
            send.firstCall.should.be.calledWith('data')
            send.secondCall.should.be.calledWith('payload')

            process.send = null
          })

          clock.tick(10)
        })

        addListener.should.be.calledOnce
        addListener.should.be.calledWith('message', sinon.match.typeOf('function'))
      }))

      it('should take err as fatal signal', sinon.test(function(done) {
        var addListener = this.stub(process, 'on').callsArg(1)
          , clock = this.clock
          , send

        process.send = function() {
          if (done) { done(); done = null }
        }

        send = this.spy(process, 'send')

        ready(function(job, callback) {
          setImmediate(function() {
            callback('errord')

            send.should.be.calledTwice
            send.firstCall.should.be.calledWith('error')
            send.secondCall.should.be.calledWith('errord')

            process.send = null
          })

          clock.tick(10)
        })

        addListener.should.be.calledOnce
        addListener.should.be.calledWith('message', sinon.match.typeOf('function'))
      }))
    })

    describe('thunk: return thunk with signature function(function(err, data) {}), {}', function() {
      it('should pass data back via thunk', sinon.test(function(done) {
        var addListener = this.stub(process, 'on').callsArg(1)
          , clock = this.clock
          , send

        process.send = function() {
          if (done) { done(); done = null }
        }

        send = this.spy(process, 'send')

        ready(function(job) {
          return function(callback) {
            setImmediate(function() {
              callback(null, 'payload')

              send.should.be.calledTwice
              send.firstCall.should.be.calledWith('data')
              send.secondCall.should.be.calledWith('payload')

              process.send = null
            })

            clock.tick(10)
          }
        })

        addListener.should.be.calledOnce
        addListener.should.be.calledWith('message', sinon.match.typeOf('function'))
      }))

      it('should take err as fatal signal', sinon.test(function(done) {
        var addListener = this.stub(process, 'on').callsArg(1)
          , clock = this.clock
          , send

        process.send = function() {
          if (done) { done(); done = null }
        }

        send = this.spy(process, 'send')

        ready(function(job) {
          return function(callback) {
            setImmediate(function() {
              callback('errord')

              send.should.be.calledTwice
              send.firstCall.should.be.calledWith('error')
              send.secondCall.should.be.calledWith('errord')

              process.send = null
            })

            clock.tick(10)
          }
        })

        addListener.should.be.calledOnce
        addListener.should.be.calledWith('message', sinon.match.typeOf('function'))
      }))
    })

    describe('promise: return a `thenable` of signature { then: function(onFulfilled, onRejected) {} }', function() {
      it('should pass data back via thunk', sinon.test(function(done) {
        var addListener = this.stub(process, 'on').callsArg(1)
          , clock = this.clock
          , send

        process.send = function() {
          if (done) { done(); done = null }
        }

        send = this.spy(process, 'send')

        ready(function(job) {
          return new Promise(function(resolve, reject) {
            setImmediate(function() {
              resolve('payload')

              send.should.be.calledTwice
              send.firstCall.should.be.calledWith('data')
              send.secondCall.should.be.calledWith('payload')

              process.send = null
            })

            clock.tick(10)
          })
        })

        addListener.should.be.calledOnce
        addListener.should.be.calledWith('message', sinon.match.typeOf('function'))
      }))

      it('should take err as fatal signal', sinon.test(function(done) {
        var addListener = this.stub(process, 'on').callsArg(1)
          , clock = this.clock
          , send

        process.send = function() {
          if (done) { done(); done = null }
        }

        send = this.spy(process, 'send')

        ready(function(job) {
          return new Promise(function(resolve, reject) {
            setImmediate(function() {
              reject('errord')

              send.should.be.calledTwice
              send.firstCall.should.be.calledWith('error')
              send.secondCall.should.be.calledWith('errord')

              process.send = null
            })

            clock.tick(10)
          })
        })

        addListener.should.be.calledOnce
        addListener.should.be.calledWith('message', sinon.match.typeOf('function'))
      }))
    })
  })
})
