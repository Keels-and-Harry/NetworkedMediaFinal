# nedb-promises-session-store

A session store implementation for [Express](http://expressjs.com/) & [Connect](https://github.com/senchalabs/connect) backed by a [NeDB Promises](https://github.com/bajankristof/nedb-promises) datastore (either in-memory or file-persisted).

Previously this code was made by [James M. Greene](https://github.com/JamesMGreene), but I did a lot of changes, I rewrote it on TypeScript for nedb-promises which is based on [@seald-io/nedb](https://github.com/seald/nedb) package to solve some vulnerability issues.

## Getting Started

```shell
npm install --save nedb-promises-session-store
```


## Usage

```ts
const session = require('express-session');
const makeStore = require('nedb-promises-session-store');
// on Typescript you should import it like this
// import makeStore from 'nedb-promises-session-store';

makeStore({
  connect: session,
  filename: 'path_to_nedb.db'
});
```

### Options
#### `defaultExpiry`

_Optional._ **[Number]** The default expiry period (max age) in milliseconds to use _if and ONLY if_ the session's expiration is not controlled by the session Cookie configuration. Defaults to 2 weeks.


#### `inMemoryOnly`

_Optional._ **[Boolean]** Only persist the datastore within the available in-process memory. Defaults to `false`.


#### `filename`

_Optional._ **[String]** The path to the file where the datastore will be persisted.  If not provided, the datastore will automatically be assigned the `filename` of `'data/sessions.db'`.

For more details about the underlying `filename` option, please read about it in the [NeDB documentation][].


#### `afterSerialization`

_Optional._ **[Function]** A hook that you can use to transform data after it was serialized and before it is written to disk. A common example usage for this hook is to encrypt data before writing the database to disk.

_**ONLY applies when your NeDB datastore is file-persisted!**_

For more details about the underlying `afterSerialization` option, please read about it in the [NeDB documentation][].


#### `beforeDeserialization`

_Optional._ **[Function]** The inverse of [`afterSerialization`](#afterserialization): a hook that you can use to transform data after it was read from disk and before it is deserialized. A common example usage for this hook is to decrypt data after reading the database from disk.

_**ONLY applies when your NeDB datastore is file-persisted!**_

For more details about the underlying `beforeDeserialization` option, please read about it in the [NeDB documentation][].


#### `corruptAlertThreshold`

_Optional._ **[Number]** NeDB will refuse to start if more than this percentage of the datafile is corrupt. Valid values must be a number between `0` (0%) and `1` (100%). A value of `0` means you do NOT tolerate any corruption, `1` means you do not care about corruption. NeDB uses a default value of `0.1` (10%).

_**ONLY applies when your NeDB datastore is file-persisted!**_

For more details about the underlying `corruptAlertThreshold` option, please read about it in the [NeDB documentation][].


#### `autoCompactInterval`

_Optional._ **[Number]** NeDB's file persistence uses an append-only format for performance reasons, meaning that all updates and deletes actual result in lines being _added_ at the end of the datastore file. To compact the file back into a 1-line-per-document format, you must either restart your application or specify an automatic compaction interval with this option. Valid values must be either `null` (disabled) or an integer between `5000` (5 seconds) and `86400000` (1 day). Defaults to 1 day.

_**ONLY applies when your NeDB datastore is file-persisted!**_

For more details about the underlying automatic compaction functionality, please read about it in the [NeDB documentation](https://github.com/louischatriot/nedb#persistence).



## Middleware Integration

```js
const sharedSecretKey = 'yoursecret';
const express = require('express');
const session = require('express-session');
const makeStore = require('nedb-promises-session-store');

const app = express();

app.use(
  session({
    secret: sharedSecretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
      path: '/',
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000   // e.g. 1 year
    },
    store: makeStore({
      connect: session,
      filename: 'path_to_nedb_persistence_file.db'
    }),
  })
);
```
