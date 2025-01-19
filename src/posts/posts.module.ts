import { Module } from '@nestjs/common';

import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { RepositoriesModule } from 'src/repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
