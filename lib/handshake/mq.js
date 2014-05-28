
module.exports = function handshake(callback) {
  if (!process.send) { return }

  process.once('message', function(ack) {
    var match = ack.toString().match(/(\d+):ack/)
      , pid = match && match[1]

    if (pid == process.pid) {
      callback(null)

      process.send(pid + ':ready')
    }
    else {
      callback(new Error('MQ handshake failed: Pool failed to ack'))
    }
  })

  process.send(process.pid + ':init')
}
