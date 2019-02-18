// TODO-MVP: Add custom scalars such as graphql-iso-date
// import { GraphQLDate, GraphQLDateTime, GraphQLTime } from 'graphql-iso-date';

import { ApolloServer } from 'apollo-server-express';
import * as dotenv from 'dotenv';
import { Request } from 'express';
import express = require('express');
import { GraphQLSchema } from 'graphql';
import { Binding } from 'graphql-binding';
import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';
import opn = require('opn');
import { AuthChecker, buildSchema, useContainer as TypeGraphQLUseContainer } from 'type-graphql'; // formatArgumentValidationError
import { Container } from 'typedi';
import { Connection, ConnectionOptions, useContainer as TypeORMUseContainer } from 'typeorm';

import { logger, Logger } from '../core/logger';
import { getRemoteBinding } from '../gql';
import { DataLoaderMiddleware, healthCheckMiddleware } from '../middleware';
import { authChecker } from '../tgql';
import { createDBConnection, mockDBConnection } from '../torm';

import { CodeGenerator } from './code-generator';
import { Config } from './config';

import { BaseContext } from './Context';

export interface ServerOptions<T> {
  container?: Container;

  authChecker?: AuthChecker<T>;
  context?: (request: Request) => object;
  host?: string;
  generatedFolder?: string;
  middlewares?: any[]; // TODO: fix
  mockDBConnection?: boolean;
  openPlayground?: boolean;
  port?: string | number;
  resolversPath?: string[];
  warthogImportPath?: string;
}

export class Server<C extends BaseContext> {
  appConfig: Config;
  authChecker: AuthChecker<C>;
  connection!: Connection;
  container: Container;
  graphQLServer!: ApolloServer;
  httpServer!: HttpServer | HttpsServer;
  logger: Logger;
  schema?: GraphQLSchema;

  constructor(
    private appOptions: ServerOptions<C>,
    private dbOptions: Partial<ConnectionOptions> = {}
  ) {
    if (!process.env.NODE_ENV) {
      throw new Error("NODE_ENV must be set - use 'development' locally");
    }
    dotenv.config();

    // Ensure that Warthog, TypeORM and TypeGraphQL are all using the same typedi container
    this.container = this.appOptions.container || Container;
    TypeGraphQLUseContainer(this.container as any); // TODO: fix any
    TypeORMUseContainer(this.container as any); // TODO: fix any

    if (this.appOptions.host) {
      throw new Error(
        '`host` option has been removed, please set `WARTHOG_APP_HOST` environment variable instead'
      );
    }
    if (this.appOptions.port) {
      throw new Error(
        '`port` option has been removed, please set `WARTHOG_APP_PORT` environment variable instead'
      );
    }
    if (this.appOptions.generatedFolder) {
      throw new Error(
        '`generatedFolder` option has been removed, please set `WARTHOG_GENERATED_FOLDER` environment variable instead'
      );
    }

    this.authChecker = this.appOptions.authChecker || authChecker;
    // TODO: remove container here and allow logger to be passed in
    this.logger = Container.has('LOGGER') ? Container.get('LOGGER') : logger;

    this.appConfig = new Config();
    this.appConfig.loadSync();
    Container.set('WARTHOG_CONFIG', this.appConfig);
  }

  async establishDBConnection(): Promise<Connection> {
    if (!this.connection) {
      // Asking for a mock connection will not connect to your preferred DB and will instead
      // connect to sqlite so that you can still access all metadata
      const connectionFn = this.appConfig.get('MOCK_DATABASE')
        ? mockDBConnection
        : createDBConnection;

      this.connection = await connectionFn(this.dbOptions);
    }

    return this.connection;
  }

  async getBinding(options: { origin?: string; token?: string } = {}): Promise<Binding> {
    return getRemoteBinding(
      `http://${process.env.WARTHOG_APP_HOST}:${process.env.WARTHOG_APP_PORT}/graphql`,
      {
        origin: 'warthog',
        ...options
      }
    );
  }

  async buildGraphQLSchema(): Promise<GraphQLSchema> {
    if (!this.schema) {
      this.schema = await buildSchema({
        authChecker: this.authChecker,
        // TODO: ErrorLoggerMiddleware
        globalMiddlewares: [DataLoaderMiddleware, ...(this.appOptions.middlewares || [])],
        resolvers: this.appConfig.get('RESOLVERS_PATH')
        // TODO: scalarsMap: [{ type: GraphQLDate, scalar: GraphQLDate }]
      });
    }

    return this.schema;
  }

  async generateFiles(): Promise<void> {
    await this.establishDBConnection();

    await new CodeGenerator(this.connection, this.appConfig.get('WARTHOG_GENERATED_FOLDER'), {
      resolversPath: this.appConfig.get('RESOLVERS_PATH'),
      warthogImportPath: this.appOptions.warthogImportPath
    }).generate();
  }

  async start() {
    await this.establishDBConnection();
    await this.generateFiles();
    await this.buildGraphQLSchema();

    const contextGetter =
      this.appOptions.context ||
      (() => {
        return {};
      });

    this.graphQLServer = new ApolloServer({
      context: (options: { req: Request }) => {
        return {
          connection: this.connection,
          dataLoader: {
            initialized: false,
            loaders: {}
          },
          request: options.req,
          // Allows consumer to add to the context object - ex. context.user
          ...contextGetter(options.req)
        };
      },
      schema: this.schema
    });

    const app = express();
    app.use('/health', healthCheckMiddleware);

    this.graphQLServer.applyMiddleware({ app, path: '/graphql' });

    const url = `http://${this.appConfig.get('APP_HOST')}:${this.appConfig.get('APP_PORT')}${
      this.graphQLServer.graphqlPath
    }`;

    this.httpServer = app.listen({ port: this.appConfig.get('APP_PORT') }, () =>
      this.logger.info(`🚀 Server ready at ${url}`)
    );

    // Open playground in the browser
    if (this.shouldOpenPlayground()) {
      opn(url, { wait: false });
    }

    return this;
  }

  async stop() {
    this.logger.info('Stopping HTTP Server');
    this.httpServer.close();
    this.logger.info('Closing DB Connection');
    await this.connection.close();
  }

  private shouldOpenPlayground(): boolean {
    // If an explicit value is passed in, always use it
    if (typeof this.appOptions.openPlayground !== 'undefined') {
      return this.appOptions.openPlayground;
    }

    // If Jest is running, be smart and don't open playground
    if (typeof process.env.JEST_WORKER_ID !== 'undefined') {
      return false;
    }

    // Otherwise, only open in development
    return process.env.NODE_ENV === 'development';
  }
}

// Backwards compatability.  This was renamed.
export const App = Server;
