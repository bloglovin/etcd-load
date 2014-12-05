#!/usr/bin/env node
/* jshint node: true */
/* global -Promise */

'use strict';

var fs = require('fs');
var url = require('url');

var docopt = require('docopt');
var obpath = require('obpath.js');
var Bletcd = require('bletcd');
var Promise = require('promise');

var pkg = require('./package.json');


var doc = fs.readFileSync(__dirname + '/usage.txt', { encoding: 'utf8' });
var opt = docopt.docopt(doc, {version: pkg.version});

var etcdUrl = url.parse(opt['--etcd']);
var sslOpts = etcdUrl.protocol === 'https:' ? {} : undefined;
var etcd = new Bletcd(etcdUrl.hostname, etcdUrl.port, sslOpts);

var testRegex;
if (opt['--key-filter']) {
  try {
    testRegex = new RegExp(opt['--key-filter']);
  } catch (err) {
    console.error('Bad key filter regexp:', err.message);
    process.exit(1);
  }
}

if (opt.dump) {
  etcd.get('', {recursive:true}, function(err, keys) {
    if (err) {
      console.error('Failed to load values from etcd:', err.message);
      process.exit(2);
    }

    var context = obpath.createContext();
    context.allowDescendants = true;

    var leavesExp = obpath.mustCompile('..nodes[*](has(@.value))', context);
    var values = leavesExp.evaluate(keys);

    if (testRegex) {
      values = values.filter(function (kv) {
        return testRegex.test(kv.key);
      });
    }

    var json = JSON.stringify(values, null, '  ');
    if (opt['<file>']) {
      fs.writeFile(opt['<file>'], json, function(err) {
        if (err) {
          console.error('Failed to write values to', opt['<file>'],':', err.message);
          process.exit(3);
        }
      });
    }
    else {
      console.log(json);
    }
  });
}
else if (opt.restore) {
  fs.readFile(opt['<file>'], {encoding:'utf8'}, function(err, json) {
    var values;
    try {
      values = JSON.parse(json);
    } catch (err) {
      console.error('Invalid JSON:', err.message);
      process.exit(4);
    }

    if (testRegex) {
      values = values.filter(function (kv) {
        return testRegex.test(kv.key);
      });
    }

    var writes = values.map(function (kv) {
      return writePromise(kv)
        .then(function() {
          process.stderr.write('.');
        })
        .then(undefined, function(err) {
          console.error('\nFailed to write', kv.key, ':', err.message);
        });
    });

    Promise.all(writes).then(function() {
      process.stderr.write('\n');
    });

    function writePromise(kv) {
      return new Promise(function(resolve, reject) {
        var options = {};
        if (!opt['--drop-ttls']) {
          if (kv.expiration) {
            var expire = new Date(kv.expiration).getTime();
            if (expire < Date.now()) {
              return resolve();
            }
            options.ttl = Math.round((expire-Date.now())/1000);
          }
        }
        etcd.set(kv.key, kv.value, options, function(err) {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    }
  });
}
