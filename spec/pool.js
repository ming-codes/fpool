
var path = require('path')

var chai = require('chai')
var sinon = require('sinon')
var lib = '../lib'

chai.should()
chai.use(require('sinon-chai'))

describe('WorkerPool', function() {

  function makeInstance(modulePath, argv, options) {
      var WorkerPool = require(path.join(lib, 'pool'))

      return new WorkerPool(modulePath, argv, options)
  }

  function makeStubProcess() {
    var Emitter = require('events').EventEmitter
      , emitter = new Emitter

    emitter = Object.create(emitter)
    emitter.kill = function stubKill() {}

    return emitter
  }

  function matchArgv(target) {
    return sinon.match(function(argv) {
      var index = 0, len = Math.max(target.length, argv.length)


      while (index++ < len) {
        if (target[index] !== argv[index]) {
          return false
        }
      }

      return true
    })
  }

  after(function() {
    process.removeAllListeners()
  })

  describe('#fork', function() {
    it('should take modulePath, argv, options as arguments', sinon.test(function() {
      var spawn = this.stub(require('child_process'), 'spawn')
      var WorkerPool = require(path.join(lib, 'pool'))

      WorkerPool.prototype.fork('path/to/target/module.coffee', [ '--app' ], {
        cwd: 'path/to/wd'
      })

      spawn.should.be.calledOnce
      spawn.should.be.calledWith(
        process.execPath,
        matchArgv([ 'path/to/target/module.coffee', '--app' ]),
        sinon.match.has('cwd', 'path/to/wd')
      )
    }))

    it('should take modulePath, options as arguments', sinon.test(function() {
      var spawn = this.stub(require('child_process'), 'spawn')
      var WorkerPool = require(path.join(lib, 'pool'))

      WorkerPool.prototype.fork('path/to/target/module.coffee', {
        cwd: 'path/to/wd'
      })

      spawn.should.be.calledOnce
      spawn.should.be.calledWith(
        process.execPath,
        matchArgv([ ]),
        sinon.match.has('cwd', 'path/to/wd')
      )
    }))

    it('should take modulePath, argv as arguments', sinon.test(function() {
      var spawn = this.stub(require('child_process'), 'spawn')
      var WorkerPool = require(path.join(lib, 'pool'))

      WorkerPool.prototype.fork('path/to/target/module.coffee', {
        env: {
          HOME: '~'
        }
      })

      spawn.should.be.calledOnce
      spawn.should.be.calledWith(
        process.execPath,
        matchArgv([ 'path/to/target/module.coffee' ]),
        sinon.match.has('cwd', undefined)
      )
    }))

    it('should use execPath initial script', sinon.test(function() {
      var spawn = this.stub(require('child_process'), 'spawn')
      var WorkerPool = require(path.join(lib, 'pool'))

      WorkerPool.prototype.fork('path/to/target/module.coffee', {
        execPath: 'path/to/coffee'
      })

      spawn.should.be.calledOnce
      spawn.should.be.calledWith(
        process.execPath,
        matchArgv([ 'path/to/coffee', 'path/to/target/module.coffee' ]),
        sinon.match.has('cwd', undefined)
      )
    }))

    it('should use execArgv as node options', sinon.test(function() {
      var spawn = this.stub(require('child_process'), 'spawn')
      var WorkerPool = require(path.join(lib, 'pool'))

      WorkerPool.prototype.fork('path/to/target/module.coffee', {
        execPath: 'path/to/coffee',
        execArgv: [ '--harmony' ]
      })

      spawn.should.be.calledOnce
      spawn.should.be.calledWith(
        process.execPath,
        matchArgv([ '--harmony', 'path/to/coffee', 'path/to/target/module.coffee' ]),
        sinon.match.has('cwd', undefined)
      )
    }))
  })

  describe('#enqueue', sinon.test(function() {
    it('should queue the passed in job', sinon.test(function() {
      var modulePath = 'path/to/module'
      var pool = makeInstance(modulePath)
        , job = { the: 'job' }
        , spinUp = this.stub(pool, 'spinUp')
        , fork = this.stub(pool, 'fork').returns(makeStubProcess())

      pool.enqueue({ job: 'job' })

      pool.queue.length.should.equal(2)

      spinUp.should.be.calledOnce

    }))

    it('should returns a thunk to communicate job finish', function() {
      var modulePath = path.join(__dirname, 'fixture', 'worker.js')
      var pool = makeInstance(modulePath)
        , thunk

      thunk = pool.enqueue({ job: 'job' })

      thunk.should.be.a('function').have.property('length').equal(1)

      thunk(function(err, data) { this.kill() })
    })

    it('should spin up additional workers in case not enough', sinon.test(function() {
      var modulePath = path.join(__dirname, 'fixture', 'worker.js')
      var pool = makeInstance(modulePath)

      pool.enqueue({ job: 'job' })(function(err, data) {
        this.kill()
      })
    }))
  }))

  describe('#spinUp', function() {
    it('should use #fork to create process', sinon.test(function() {
      var modulePath = 'path/to/module'
      var pool = makeInstance(modulePath)
        , fork = this.stub(pool, 'fork').returns(makeStubProcess())

      pool.spinUp()

      fork.should.be.calledOnce
      fork.should.be.calledWith(modulePath)

    }))
  })

})
