
//
// Worker should only pass `error` back when in a unrecoverable
// state and therefore should be killed and restarted.
//
// Otherwise, worker should pass status message back as `data`.
//
module.exports = function onReady(fn) {
  handshake(fn)
}

// Negotiate protocol with parent
// The handshake is simple:
// Child process send over its own
// pid. Parent process verifies
// and echo back the pid.
function handshake(fn) {
  if (!process.send) { return }

  process.once('message', function(ack) {
    var match = ack.toString().match(/(\d+):ack/)
      , pid = match && match[1]

    if (pid == process.pid) {
      bootstrap(fn)

      process.send(pid + ':ready')
    }
  })

  process.send(process.pid + ':init')
}

function bootstrap(fn) {
  process.on('message', function(job) {
    var ret

    // call style 1: callback
    if (fn.length == 2) {
      fn(job, MessageQueue$callback)
    }
    else if (typeof (ret = fn(job)) != 'undefined') {
      // sync or thunk/promise

      // call style 2: thunk
      if (typeof ret == 'function') {
        ret(MessageQueue$callback)
      }
      // call style 3: promise
      else if (typeof ret.then == 'function' && ret.then.length >= 2) {
        ret.then(
          function onFulfilled(data) {
            MessageQueue$callback(null, data)
          },
          function onRejected(err) {
            MessageQueue$callback(err, null)
          }
        )
      }
    }

    function MessageQueue$callback(err, data) {
      if (err) {
        process.send('error')
        process.send(err)
      }
      else {
        if (typeof data == 'undefined') { data = '' }

        process.send('data')
        process.send(data)
      }
    }

  })
}
