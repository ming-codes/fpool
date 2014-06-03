
var handshake = require('./handshake/mq')

//
// Worker should only pass `error` back when in a unrecoverable
// state and therefore should be killed and restarted.
//
// Otherwise, worker should pass status message back as `data`.
//
module.exports = function onReady(fn) {
  handshake(function(err) {
    if (err) { throw err }

    bootstrap(fn)
  })
}

function bootstrap(fn) {
  process.on('SIGTERM', function() { process.removeListener('message', MessageHandler) })

  process.on('message', MessageHandler)

  function MessageHandler(job) {
    var ret

    // call style 1: callback
    if (fn.length == 2) {
      fn(job, MessageQueue$callback)
    }
    else {
      try {
        ret = fn(job)
      }
      catch (err) {
        return MessageQueue$callback(err, null)
      }

      if (typeof ret != 'undefined') {
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
        else {
          MessageQueue$callback(null, ret)
        }
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

  }

}
