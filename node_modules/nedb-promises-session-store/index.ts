/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-use-before-define */
import Datastore from 'nedb-promises';
import { EventEmitter } from 'events';
import type { SessionData, Store } from 'express-session';

const ONE_DAY = 86400000;
const TWO_WEEKS = 14 * ONE_DAY;

type DatastoreOptionsXOR = {
  filename: string;
  inMemoryOnly?: never;
} | {
  filename?: never;
  inMemoryOnly: boolean;
};

type DatastoreOptions = DatastoreOptionsXOR & {
  connect: any;
  defaultExpiry?: number;
  autoCompactInterval?: number;
  nodeWebkitAppName?: boolean;
  onload?: (error: Error) => void;
  afterSerialization?: (line: string) => string;
  beforeDeserialization?: (line: string) => string;
  corruptAlertThreshold?: number;
};

type SessionUnit = {
  _id: string;
  session: SessionData;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Create a new session store, backed by an NeDB datastore
 * @param {DatastoreOptions}   options                        Primarily a subset of the options from https://github.com/louischatriot/nedb#creatingloading-a-database
 * @param {Function}           options.connect                Connect Connect-compatible session middleware (e.g. Express, express-session)
 * @param {Number}             options.defaultExpiry          The default expiry period (max age) in milliseconds to use if the session's expiry is not controlled by the session cookie configuration. Default: 2 weeks.
 * @param {Boolean}            options.inMemoryOnly           The datastore will be in-memory only. Overrides `options.filename`.
 * @param {String}             options.filename               Relative file path where session data will be persisted; if none, a default of 'data/sessions.db' will be used.
 * @param {Function}           options.afterSerialization     Optional serialization callback invoked before writing to file, e.g. for encrypting data.
 * @param {Function}           options.beforeDeserialization  Optional deserialization callback invoked after reading from file, e.g. for decrypting data.
 * @param {Number}             options.corruptAlertThreshold  Optional threshold after which an error is thrown if too much data read from file is corrupt. Default: 0.1 (10%).
 * @param {Number}             options.autoCompactInterval    Optional interval in milliseconds at which to auto-compact file-based datastores. Valid range is 5000ms to 1 day. Pass `null` to disable.
 * @param {Function}           options.onload                 Optional callback to be invoked when the datastore is loaded and ready.
 * @returns {Store}  your new Store
 */
const makeStore = (options: DatastoreOptions): Store => {
  const defaultExpiry = options.defaultExpiry ?? TWO_WEEKS;
  const datastore = Datastore.create({
    ...options,
    autoload: true,
    timestampData: true,
    onload: (error) => {
      if (error) {
        store.emit('error', error);
      }
      store.emit(`${error ? 'dis' : ''}connect`);

      if (options.onload) options.onload(error);
    },
    ...(options.inMemoryOnly ? {
      afterSerialization: undefined,
      beforeDeserialization: undefined,
      corruptAlertThreshold: undefined,
    } : {})
  });

  if (options.filename && options.autoCompactInterval) {
    // autoCompactInterval in the region [5000, ONE_DAY]
    const autoCompactInterval = Math.min(Math.max(options.autoCompactInterval, 5000), ONE_DAY);
    datastore.persistence.setAutocompactionInterval(autoCompactInterval);
  }

  const parentStore = (options.connect.Store ?? options.connect.session.Store).prototype;
  const store: Store = {
    ...EventEmitter.prototype,
    ...parentStore,
    set: async (sid, session, callback) => {
      const expirationDate: Date = session?.cookie?.expires
        ? new Date(session.cookie.expires)
        : new Date(Date.now() + defaultExpiry);

      const sess: SessionData = {
        ...session,
      };

      try {
        await datastore.update(
          { _id: sid },
          { $set: { session: sess, expiresAt: expirationDate } },
          { multi: false, upsert: true },
        );

        if (callback) callback();
      } catch (error) {
        if (callback) callback(error);
      }
    },
    touch: async (sid, session, callback) => {
      const touchSetOp: Partial<SessionUnit> = {
        updatedAt: new Date(),
        ...(session?.cookie?.expires ? { expiresAt: new Date(session.cookie.expires) } : {})
      };

      await datastore.update(
        { _id: sid },
        { $set: touchSetOp },
        { multi: false, upsert: false },
      );

      if (callback) callback();
    },
    get: async (sid, callback) => {
      try {
        const doc = await datastore.findOne<SessionUnit>({ _id: sid });
        if (doc != null) {
          if ((doc.session && !doc.expiresAt) || new Date() < doc.expiresAt) {
            return callback(null, doc.session);
          }

          return store.destroy(sid, (error) => { callback(error, null); });
        }
        callback(null);
      } catch (error) {
        callback(error, null);
      }
    },
    all: async (callback) => {
      try {
        const existingDocs = await datastore.find<SessionUnit>({});
        const sessions = existingDocs.reduce<SessionData[]>((accumulator, doc) => {
          if ((doc.session && !doc.expiresAt) || new Date() < doc.expiresAt) {
            accumulator.push(doc.session);
          }

          store.destroy(doc._id, (error) => error && store.emit('error', error));

          return accumulator;
        }, []);

        callback(null, sessions);
      } catch (error) {
        callback(error, null);
      }
    },
    length: async (callback) => {
      if (store.all != null) {
        store.all((err, sessions) => {
          callback(err, (sessions as SessionData[]).length);
        });
      }
    },
    destroy: async (sid, callback) => {
      try {
        await datastore.remove({ _id: sid }, { multi: false });
        if (callback) callback();
      } catch (error) {
        if (callback) callback(error);
      }
    },
    clear: async (callback) => {
      try {
        await datastore.remove({}, { multi: this });
        if (callback) callback();
      } catch (error) {
        if (callback) callback(error);
      }
    },
  };

  return store;
};

export = makeStore;
