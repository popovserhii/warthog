import { BaseModel, Model, OneToMany, StringField } from '../../../src';

@Model()
export class User extends BaseModel {
  @StringField()
  firstName?: string;
}
