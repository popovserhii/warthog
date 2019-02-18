import { ConnectionOptions, createConnection } from 'typeorm';

import { SnakeNamingStrategy } from './SnakeNamingStrategy';

// Note: all DB options should be specified by environment variables
// Either using TYPEORM_<variable> or WARTHOG_DB_<variable>
export const createDBConnection = (dbOptions: Partial<ConnectionOptions> = {}) => {
  const config = {
    namingStrategy: new SnakeNamingStrategy(),
    type: 'postgres',
    ...dbOptions
  };

  return createConnection(config as any); // TODO: fix any.  It is complaining about `type`
};

// Provide a sort of mock DB connection that will create a sqlite DB, but will expose
// all of the TypeORM entity metadata for us.  Ideally, we'd recreate all of the
// TypeORM decorators, but for now, using this "mock" connection and reading from their
// entity metadata is a decent hack
export const mockDBConnection = (dbOptions: Partial<ConnectionOptions> = {}) => {
  return createDBConnection({
    ...dbOptions,
    database: 'warthog.sqlite.tmp',
    synchronize: false,
    type: 'sqlite'
  } as any);
};
