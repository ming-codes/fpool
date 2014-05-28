
module.exports = function handshake(worker, onReady) {
  var context = this

  worker.once('message', function(init) {
    var match = init.toString().match(/(\d+):init/)
      , pid = match && match[1]

    if (pid == worker.pid) {
      worker.once('message', function(ready) {
        var match = init.toString().match(/(\d+):ready/)
          , pid = match && match[1]

        bootstrap.call(context, worker)

        worker.status = 'ready'

        onReady(worker)
      })

      worker.send(pid + ':ack')
    }
  })
}
