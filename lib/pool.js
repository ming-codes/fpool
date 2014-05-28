
var handshake = require('./handshake/pool')

module.exports = WorkerPool

function WorkerPool(modulePath, argv, options) {
  this.modulePath = modulePath
  this.argv = argv
  this.options = options || {}
  this.size = this.options.size || require('os').cpus().length

  this.queue = []
  this.workers = []
}

WorkerPool.prototype.fork = function WorkerPool$fork(modulePath, argv, options) {
  var argv
    , spawn = require('child_process').spawn
    , execArgv
    , execPath
    , node, opt, stdio

  if (typeof argv == 'object' && !Array.isArray(argv)) {
    options = argv
    argv = null
  }

  argv || (argv = [])
  execArgv = options.execArgv || []
  execPath = options.execPath || []
  stdio = options.stdio;
  stdio || (stdio = options.silent ? ['pipe', 'pipe', 'pipe', 'ipc'] : [0, 1, 2, 'ipc']);

  node = process.execPath
  argv = execArgv.concat(execPath, modulePath, argv)
  opt = {
    cwd: options.cwd,
    stdio: stdio,
    encoding: options.encoding || 'utf8',
    env: options.env,
    detached: options.detached,
    uid: options.uid,
    gid: options.gid
  }

  return spawn(node, argv, opt)
}

WorkerPool.prototype.enqueue = function(job) {
  var handler

  this.queue.push(job, handler = {})

  this.run()

  return function(callback) {
    if (typeof callback == 'function') {
      if (callback.length == 2) {
        handler.callback = callback
      }
      // `callback` is promise constructor
      else {
        return new callback(function(resolve, reject) {
          handler.callback = function(err, data) {
            if (err) {
              reject(err)
            }
            else {
              resolve(data)
            }
          }
        })
      }
    }
  }
}

WorkerPool.prototype.run = function() {
  var queue = this.queue
    , workers = this.workers
    , limit = this.size
    , spinUp = this.spinUp
    , context = this
    , len

  workers = workers.filter(function(worker) { return worker.status == 'ready' })

  while (queue.length && workers.length) {
    (function(worker, job, handler) {
      // TODO refactor as 'assign'
      worker.status = 'busy'
      worker.job = job
      worker.callback = handler.callback
      worker.send(job)
    })(workers.pop(), queue.shift(), queue.shift())
  }

  if (queue.length && context.workers.length < limit) {
    // spin up minimal number of processes that can take
    // on the queued number of tasks
    len = Math.min(limit - workers.length, queue.length / 2)

    while (len--) {
      context.workers.push(context.spinUp(function(worker) {
        context.run()
      }))
    }
  }
}

WorkerPool.prototype.spinUp = function WorkerPool$spinUp(onReady) {
  var worker = this.fork(this.modulePath, this.argv || [], this.options)

  worker = Object.create(worker)
  worker.status = 'alive'

  process.once('exit', function() { return worker.kill() })

  worker.once('exit', function() {
    worker.status = 'dead'
  })

  handshake.call(this, worker, onReady)

  return worker
}

function bootstrap(worker) {
  var context = this

  worker.once('message', function getType(type) {
    worker.once('message', function getPayload(data) {
      var job = worker.job
        , callback = worker.callback

      worker.job = worker.callback = null

      if (type == 'error') {
        console.error(data)

        worker.kill()

        callback && callback.call(worker, data, null)
      }

      if (type == 'data') {
        callback && callback.call(worker, null, data)

        worker.status = 'ready'

        worker.once('message', getType)

        context.run()
      }
    })
  })
}

