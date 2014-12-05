# Etcd load

Simple tool for dumping and restoring data from etcd.

Install using: `npm install -g etcd-load`

```
Usage:
etcd-load dump [--key-filter=<regex>] [--etcd=<url>] [<file>]
etcd-load restore [--key-filter=<regex>] [--etcd=<url>] [--drop-ttls] <file>

Options:

-h --help               Show this screen.
-v --version            Show version.
--etcd=<url>            The etcd server to connect to [default: http://localhost:4001].
--key-filter=<regex>    A regex for selecting keys for the operation
--drop-ttls             Ignore ttls.
```
