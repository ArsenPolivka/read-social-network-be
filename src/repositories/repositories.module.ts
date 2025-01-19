import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { userProviders } from 'src/users/providers/user.providers';
import { bookProviders } from 'src/books/providers/books.providers';
import { postProviders } from 'src/posts/providers/posts.providers';

@Module({
  imports: [
    DatabaseModule,
  ],
  providers: [
    ...userProviders,
    ...bookProviders,
    ...postProviders,
  ],
  exports: [
    ...userProviders,
    ...bookProviders,
    ...postProviders,
  ],
})
export class RepositoriesModule {}
