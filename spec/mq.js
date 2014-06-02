
var fork = require('child_process').fork
  , path = require('path')
  , Emitter = require('events').EventEmitter

var chai = require('chai')
var sinon = require('sinon')
var Promise = require('promise')
var lib = '../lib'

chai.should()
chai.use(require('sinon-chai'))

var ready = require('../lib/mq')
  , handshake = require('../lib/handshake/pool')
  , fixture = path.join(__dirname, './fixture/worker.js')

function makeFixtureProcess(onReady) { return handshake(fork(fixture), onReady) }

function mockHandShake(onWorkerReady, onPoolReady) {
  var worker = new Emitter

  worker.pid = process.pid
  worker.send = function(message) { process.emit('message', message) }

  onPoolReady = onPoolReady || function onPoolReady(worker) {
    worker.send('job')
  }

  handshake(worker, onPoolReady)

  // TODO this is binding send
  // when to unbind it?
  process.send = function(message) {
    worker.emit('message', message)
  }

  ready(onWorkerReady)
}

describe('Message Queue', function() {
  it('should export a single function that takes a single param', function() {
    ready.should.a('function')
    ready.length.should.equal(1)
  })

  describe('Handshake', function() {
    it('should complete handshake before starting job', function(done) {
      makeFixtureProcess(function(worker) {
        done()

        worker.kill()
      })
    })
  })

  describe('Message Queue supports 3 call styles', function() {
    afterEach(function() {
      process.send = null
      process.removeAllListeners()
    })

    describe('callback: invoke callback function with signature (err, data) when done', function() {
      it('should pass data back', sinon.test(function(done) {
        var context = this
          , clock = context.clock
          , setImmediate = clock.setImmediate.bind(clock)
          , tick = clock.tick.bind(clock)

        mockHandShake(function onWorkerReady(job, callback) {
          setImmediate(function() {
            var send = context.spy(process, 'send')

            callback(null, 'payload')

            send.should.be.calledTwice
            send.firstCall.should.be.calledWith('data')
            send.secondCall.should.be.calledWith('payload')

            send.restore()

            done()
          })

          tick(10)
        })
      }))

      it('should take err as fatal signal', sinon.test(function(done) {
        var context = this
          , clock = context.clock
          , setImmediate = clock.setImmediate.bind(clock)
          , tick = clock.tick.bind(clock)

        mockHandShake(function onWorkerReady(job, callback) {
          setImmediate(function() {
            var send = context.spy(process, 'send')

            callback('errord')

            send.should.be.calledTwice
            send.firstCall.should.be.calledWith('error')
            send.secondCall.should.be.calledWith('errord')

            send.restore()

            done()
          })

          tick(10)
        })
      }))
    })

    describe('thunk: return thunk with signature function(function(err, data) {}), {}', function() {
      it('should pass data back via thunk', sinon.test(function(done) {
        var context = this
          , clock = context.clock
          , setImmediate = clock.setImmediate.bind(clock)
          , tick = clock.tick.bind(clock)

        mockHandShake(function onWorkerReady(job) {
          return function(callback) {
            setImmediate(function() {
              var send = context.spy(process, 'send')

              callback(null, 'payload')

              send.should.be.calledTwice
              send.firstCall.should.be.calledWith('data')
              send.secondCall.should.be.calledWith('payload')

              done()
            })
          }
        })

        tick(10)
      }))

      it('should take err as fatal signal', sinon.test(function(done) {
        var context = this
          , clock = context.clock
          , setImmediate = clock.setImmediate.bind(clock)
          , tick = clock.tick.bind(clock)

        mockHandShake(function onWorkerReady(job) {
          return function(callback) {
            setImmediate(function() {
              var send = context.spy(process, 'send')

              callback('errord')

              send.should.be.calledTwice
              send.firstCall.should.be.calledWith('error')
              send.secondCall.should.be.calledWith('errord')

              done()
            })

            tick(10)
          }
        })
      }))
    })

    describe('promise: return a `thenable` of signature { then: function(onFulfilled, onRejected) {} }', function() {
      it('should pass data back via promise', sinon.test(function(done) {
        var context = this
          , clock = context.clock
          , setImmediate = clock.setImmediate.bind(clock)
          , tick = clock.tick.bind(clock)

        mockHandShake(onWorkerReady, onPoolReady)

        function onPoolReady(worker) {
          var send = sinon.spy(process, 'send')

          worker.once('message', function getType(type) {
            worker.once('message', function getPayload(data) {
              send.should.be.calledTwice
              send.firstCall.should.be.calledWith('data')
              send.secondCall.should.be.calledWith('payload')

              send.restore()

              done()
            })
          })

          worker.send('job')
        }

        function onWorkerReady(job) {
          return new Promise(function(resolve, reject) {
            setImmediate(function() {
              resolve('payload')
            })

            tick(10)
          })
        }
      }))

      it('should take err as fatal signal', sinon.test(function(done) {
        var context = this
          , clock = context.clock
          , setImmediate = clock.setImmediate.bind(clock)
          , tick = clock.tick.bind(clock)

        mockHandShake(onWorkerReady, onPoolReady)

        function onPoolReady(worker) {
          var send = sinon.spy(process, 'send')

          worker.once('message', function getType(type) {
            worker.once('message', function getPayload(data) {
              send.should.be.calledTwice
              send.firstCall.should.be.calledWith('error')
              send.secondCall.should.be.calledWith('errord')

              send.restore()

              done()
            })
          })

          worker.send('job')
        }

        function onWorkerReady(job) {
          return new Promise(function(resolve, reject) {
            setImmediate(function() {
              reject('errord')
            })

            tick(10)
          })
        }
      }))
    })
  })
})
