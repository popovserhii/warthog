import { Resolver, Arg, Int, Mutation } from 'type-graphql';

import { createResourceResolver } from './resource.resolver';
import { User } from './user.entity';

@Resolver()
export class UserResolver extends createResourceResolver(User)<User> {
  // here you can add resource-specific operations

  @Mutation()
  promote(@Arg('personId', type => Int) personId: number): boolean {
    return false;
  }
}
