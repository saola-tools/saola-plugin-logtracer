# saola-plugin-logtracer test/example

## Usage

Build the module:

```shell
$ npm run build
```

Start the example:

```shell
export DEBUG=app*
export LOGOLITE_DEBUGLOG_ENABLED=true
node test/app/example
```

Make a request:

```shell
curl http://localhost:7979/tracelog-demo/tracing/index
```
