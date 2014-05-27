
var ready = require('../../lib/mq')

ready(function(job, callback) {
  setImmediate(callback)
})
