import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SystemInfo {
  @Field()
  service!: string;

  @Field()
  version!: string;

  @Field()
  environment!: string;
}
