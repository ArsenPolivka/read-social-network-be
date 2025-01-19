import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { RepositoriesModule } from 'src/repositories/repositories.module';

@Module({
  imports: [
    RepositoriesModule,
  ],
  providers: [
    BooksService,
  ],
  exports: [
    BooksService,
  ],
  controllers: [BooksController],
})
export class BooksModule {}
