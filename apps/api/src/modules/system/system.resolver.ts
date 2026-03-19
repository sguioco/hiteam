import { Query, Resolver } from '@nestjs/graphql';
import { SystemInfo } from './system.model';

@Resolver(() => SystemInfo)
export class SystemResolver {
  @Query(() => SystemInfo)
  systemInfo(): SystemInfo {
    return {
      service: 'smart-api',
      version: '0.1.0',
      environment: process.env.NODE_ENV ?? 'development',
    };
  }
}
