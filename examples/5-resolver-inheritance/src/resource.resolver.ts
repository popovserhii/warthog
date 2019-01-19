// See https://github.com/19majkel94/type-graphql/tree/master/examples/resolvers-inheritance for more info
import { GraphQLResolveInfo } from 'graphql';
import { Service } from 'typedi';
import {
  Arg,
  Ctx,
  Resolver,
  ArgsType,
  Field,
  Args,
  FieldResolver,
  Mutation,
  Root,
  ClassType,
  Query
} from 'type-graphql';

import { Resource, ResourceService, ResourceServiceFactory } from './resource.service';
import { StandardDeleteResponse } from '../../../src/tgql';

// workaround for `return type of exported function has or is using private name`
export abstract class BaseResourceResolver<TResource extends Resource> {
  protected resourceService: ResourceService<TResource>;

  protected async findOne(args: any): Promise<TResource> {
    throw new Error('Method not implemented.');
  }

  protected async find(args, ctx, info): Promise<TResource[]> {
    throw new Error('Method not implemented.');
  }

  protected async create(args: any): Promise<TResource> {
    throw new Error('Method not implemented.');
  }

  protected async update(args: any): Promise<TResource> {
    throw new Error('Method not implemented.');
  }

  protected async delete(args: any): Promise<TResource> {
    throw new Error('Method not implemented.');
  }
}

export function createResourceResolver<
  TResource extends Resource,
  TCreateInput,
  TUpdateInput,
  TWhereInput,
  TWhereUniqueInput,
  TWhereArgs extends { where: any; orderBy: any; limit: any; offset: any },
  TContext extends { user: { id: any } }
>(ResourceCls: ClassType, repository: any): typeof BaseResourceResolver {
  const resourceName = ResourceCls.name.toLocaleLowerCase();
  const resourceNamePascalCase = ResourceCls.name;
  const resourceNameCamelCase = ResourceCls.name.charAt(0).toLowerCase() + ResourceCls.name.substr(1);

  // `isAbstract` decorator option is mandatory to prevent multiple registering in schema
  @Resolver(of => ResourceCls, { isAbstract: true })
  @Service()
  abstract class ResourceResolver extends BaseResourceResolver<TResource> {
    protected resourceService: ResourceService<TResource>;

    constructor(factory: ResourceServiceFactory) {
      super();
      this.resourceService = factory.create<TResource>(ResourceCls, repository);
    }

    @Query(returns => ResourceCls, { name: `${resourceNameCamelCase}` })
    async findOne(@Arg('where') where: TWhereUniqueInput): Promise<TResource> {
      return this.resourceService.findOne<TWhereUniqueInput>(where);
    }

    @Query(returns => [ResourceCls], { name: `${resourceNameCamelCase}s` })
    async find(
      @Args() { where, orderBy, limit, offset }: TWhereArgs,
      @Ctx() ctx: TContext,
      info: GraphQLResolveInfo
    ): Promise<TResource[]> {
      return this.resourceService.find<TWhereInput>(where, orderBy, limit, offset);
    }

    @Mutation(returns => ResourceCls, { name: `create${resourceNamePascalCase}` })
    async createUser(@Arg('data') data: TCreateInput, @Ctx() ctx: TContext): Promise<TResource> {
      return this.resourceService.create(data, ctx.user.id);
    }

    @Mutation(returns => ResourceCls, { name: `update${resourceNamePascalCase}` })
    async updateUser(
      @Args() { data, where }: { data: TUpdateInput; where: TWhereUniqueInput },
      @Ctx() ctx: TContext
    ): Promise<TResource> {
      return this.resourceService.update(data, where, ctx.user.id);
    }

    @Mutation(returns => StandardDeleteResponse, { name: `delete${resourceNamePascalCase}` })
    async deleteUser(@Arg('where') where: TWhereUniqueInput, @Ctx() ctx: TContext): Promise<StandardDeleteResponse> {
      return this.resourceService.delete(where, ctx.user.id);
    }
  }

  // workaround for generics conflict
  return ResourceResolver as any;
}
