// See https://github.com/19majkel94/type-graphql/tree/master/examples/resolvers-inheritance for more info
import { Service } from 'typedi';
import { Query, Arg, Int, Resolver, ArgsType, Field, Args, FieldResolver, Root, ClassType } from 'type-graphql';

import { Resource, ResourceService, ResourceServiceFactory } from './resource.service';

// workaround for `return type of exported function has or is using private name`
export abstract class BaseResourceResolver<TResource extends Resource> {
  protected resourceService: ResourceService<TResource>;

  protected async getOne(id: string): Promise<TResource> {
    throw new Error('Method not implemented.');
  }

  protected async getAll(args: GetAllArgs): Promise<TResource[]> {
    throw new Error('Method not implemented.');
  }
}

export function createResourceResolver<TResource extends Resource>(
  ResourceCls: ClassType,
  repository: any
): typeof BaseResourceResolver {
  const resourceName = ResourceCls.name.toLocaleLowerCase();

  // `isAbstract` decorator option is mandatory to prevent multiple registering in schema
  @Resolver(of => ResourceCls, { isAbstract: true })
  @Service()
  abstract class ResourceResolver extends BaseResourceResolver<TResource> {
    protected resourceService: ResourceService<TResource>;

    constructor(factory: ResourceServiceFactory) {
      super();
      this.resourceService = factory.create(ResourceCls, repository);
    }

    @Query(returns => ResourceCls, { name: `${resourceName}` })
    protected async getOne(@Arg('id', type => String) id: string) {
      return this.resourceService.getOne(id);
    }

    @Query(returns => [ResourceCls])
    async users(
      @Args() { where, orderBy, limit, offset }: UserWhereArgs,
      @Ctx() ctx: Context,
      info: GraphQLResolveInfo
    ): Promise<TResource[]> {
      return this.find<UserWhereInput>(where, orderBy, limit, offset);
    }

    @Query(returns => ResourceCls)
    async user(@Arg('where') where: UserWhereUniqueInput): Promise<TResource> {
      return this.findOne<UserWhereUniqueInput>(where);
    }

    @Mutation(returns => ResourceCls)
    async createUser(@Arg('data') data: UserCreateInput, @Ctx() ctx: Context): Promise<TResource> {
      return this.create(data, ctx.user.id);
    }

    @Mutation(returns => ResourceCls)
    async updateUser(@Args() { data, where }: UserUpdateArgs, @Ctx() ctx: Context): Promise<TResource> {
      return this.update(data, where, ctx.user.id);
    }

    @Mutation(returns => StandardDeleteResponse)
    async deleteUser(@Arg('where') where: UserWhereUniqueInput, @Ctx() ctx: Context): Promise<StandardDeleteResponse> {
      return this.delete(where, ctx.user.id);
    }
  }

  // workaround for generics conflict
  return ResourceResolver as any;
}
