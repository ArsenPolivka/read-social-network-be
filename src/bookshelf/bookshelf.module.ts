import { Module } from '@nestjs/common';
import { BookshelfService } from './bookshelf.service';
import { BookshelfController } from './bookshelf.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BookshelfController],
  providers: [BookshelfService],
})
export class BookshelfModule {}
