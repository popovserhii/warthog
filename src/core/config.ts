import * as appRoot from 'app-root-path'; // tslint:disable-line:no-var-requires
import * as cosmiconfig from 'cosmiconfig';
import * as path from 'path';

import { ObjectUtil } from '../utils';

interface ConfigOptions {
  configSearchPath?: string;
}

const CONFIG_FILE_VALID_KEYS = ['generatedFolder', 'modelsPath', 'resolversPath'];

// const TYPEORM_ENV_VARS = [
//   'CONNECTION',
//   'HOST',
//   'USERNAME',
//   'PASSWORD',
//   'DATABASE',
//   'PORT',
//   'URL',
//   'SID',
//   'SCHEMA',
//   'SYNCHRONIZE',
//   'DROP_SCHEMA',
//   'MIGRATIONS_RUN',
//   'ENTITIES',
//   'MIGRATIONS',
//   'MIGRATIONS_TABLE_NAME',
//   'SUBSCRIBERS',
//   'ENTITY_SCHEMAS',
//   'LOGGING',
//   'LOGGER',
//   'ENTITY_PREFIX',
//   'MAX_QUERY_EXECUTION_TIME',
//   'ENTITIES_DIR',
//   'MIGRATIONS_DIR',
//   'SUBSCRIBERS_DIR',
//   'DRIVER_EXTRA',
//   'DEBUG',
//   'CACHE',
//   'CACHE_OPTIONS',
//   'CACHE_ALWAYS_ENABLED',
//   'CACHE_DURATION'
// ];

interface StaticConfigFile {
  [key: string]: any;

  generatedFolder: string;
  modelsPath: string | string[];
  resolversPath: string | string[];
}

interface StaticConfigResponse {
  filepath: string;
  config: StaticConfigFile;
}

export class Config {
  readonly DB_PREFIX = 'WARTHOG_DB_';

  readonly lockedOptions = {
    WARTHOG_DB_CONNECTION: 'postgres'
  };

  readonly defaults = {
    WARTHOG_DB_ENTITIES: ['src/**/*.model.ts'],
    WARTHOG_DB_LOGGER: 'advanced-console',
    WARTHOG_DB_MIGRATIONS: ['src/migrations/**/*.ts'],
    WARTHOG_DB_MIGRATIONS_DIR: 'src/migrations',
    WARTHOG_DB_PORT: 5432,
    WARTHOG_DB_SUBSCRIBERS: ['src/subscribers/**/*.ts'],
    WARTHOG_DB_SUBSCRIBERS_DIR: 'src/subscribers',
    WARTHOG_GENERATED_FOLDER: path.join(appRoot.path, 'generated'),
    WARTHOG_RESOLVERS_PATH: ['src/**/*.resolver.ts']
  };

  readonly devDefaults = {
    WARTHOG_APP_HOST: 'localhost',
    WARTHOG_APP_PORT: '4000',
    WARTHOG_DB_HOST: 'localhost',
    WARTHOG_DB_LOGGING: 'all',
    WARTHOG_DB_SYNCHRONIZE: true
  };

  // The full config object
  config: any;

  // APP_HOST: need to support this for backwards compatability
  //   generatedFolder?: string;
  //   mockDBConnection?: boolean;
  //   openPlayground?: boolean;
  //   port?: string | number;
  //   resolversPath?: string[];
  //   warthogImportPath?: string;

  constructor(private options: ConfigOptions = {}) {}

  loadSync(): { [key: string]: unknown } {
    const devOptions = process.env.NODE_ENV === 'development' ? this.devDefaults : {};
    const configFile = this.loadStaticConfigSync();

    // Config is loaded as a waterfall.  Items at the top of the object are overwritten by those below, so the order is:
    // - Add application-wide defaults
    // - Add development defaults (if we're runnign in DEV mode)
    // - Load config from config file
    // - Load environment variables
    const combined = {
      ...this.defaults,
      ...devOptions,
      ...configFile,
      ...this.lockedOptions
    };

    this.validateEntryExists(combined, 'WARTHOG_APP_HOST');
    this.validateEntryExists(combined, 'WARTHOG_APP_PORT');
    this.validateEntryExists(combined, 'WARTHOG_GENERATED_FOLDER');
    this.validateEntryExists(combined, 'WARTHOG_DB_CONNECTION');
    this.validateEntryExists(combined, 'WARTHOG_DB_HOST');

    this.writeTypeOrmEnvVars();

    return (this.config = combined);
  }

  public get(key: string) {
    const lookup = key.startsWith('WARTHOG_') ? key : `WARTHOG_${key}`;

    return this.config[lookup];
  }

  public writeTypeOrmEnvVars() {
    Object.keys(process.env).forEach((key: string) => {
      if (key.startsWith(this.DB_PREFIX)) {
        const keySuffix = key.substring(this.DB_PREFIX.length);

        process.env[`TYPEORM_${keySuffix}`] = process.env[key];
      }
    });
  }

  public validateEntryExists(obj: { [key: string]: unknown }, key: string) {
    if (!obj.hasOwnProperty(key) || !obj[key]) {
      throw new Error(`Config: ${key} is required`);
    }
  }

  loadStaticConfigSync() {
    const response = this.loadStaticConfigFileSync();
    if (typeof response === 'undefined') {
      return {};
    }
    const constantized = ObjectUtil.constantizeKeys(response.config);

    return ObjectUtil.prefixKeys(constantized, 'WARTHOG_');
  }

  // Use cosmiconfig to load static config that has to be the same for all environments
  // paths to folders for the most part
  private loadStaticConfigFileSync(): StaticConfigResponse | undefined {
    const explorer = cosmiconfig('warthog');

    const results = explorer.searchSync(this.options.configSearchPath);
    if (!results || results.isEmpty) {
      return;
    }

    const userConfigKeys = Object.keys(results.config);
    const badKeys = userConfigKeys.filter(x => !CONFIG_FILE_VALID_KEYS.includes(x));
    if (badKeys.length) {
      throw new Error(
        `Config: invalid keys specified in ${results.filepath}: [${badKeys.join(', ')}]`
      );
    }

    return results as StaticConfigResponse;
  }
}
