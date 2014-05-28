
NodeJS fork pool with option to use as worker pool

# fpool - Work in Progress

NodeJS fork pool with option to use as worker pool

## Installation

```bash
$ npm install git+https://github.com/lightblade/fpool.git
```

Module not yet published

## API

### WorkerPool

#### constructor

1. path to forked module
2. argv passed to the starting process
3. options: very similar to `child_process.spawn`, except...
  * execPath will be used as the script to launch to node process
  * execArgv any node specific launch options
  * size maximum number of process to spawn

#### enqueue(job)

Send job to next available worker.

### MessageQueue

The message queue consists of only one exported function.

#### ready(fn)

1. fn(job, [callback])
  1. job assigned job to this worker
  2. [callback] optional callback of signature function(err, data)

  * *return* either...
    * nothing (synchronous call)
    * thunk (asynchronous call)
    * promise(asynchronous call)

## Example

```javascript

var WorkerPool = require('fpool')

// equivilent to
// spawn('/usr/local/bin/node', [ '--harmony', '/usr/local/bin/coffee', '--argv', 'path/to/module' ])
pool = new WorkerPool('path/to/module', [ '--argv' ], {
  execPath: '/usr/local/bin/coffee',
  execArgv: '--harmony',
  size: 4
})

pool.enqueue('job')(function(err, data) {
  // done!
})

```

```javascript

var onReady = require('fpool/mq')

onReady(function(job, [callback]) {
  // sync
  return minify(job)

  // thunk
  return function(callback) {
  }

  // promise
  return new Promise(function(resolve, reject) {
  })
})

```

## License

MIT
