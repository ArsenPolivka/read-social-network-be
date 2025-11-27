import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookshelfService } from './bookshelf.service';
import { ShelfStatus } from '@prisma/client';

@Controller('bookshelf')
@UseGuards(AuthGuard('jwt'))
export class BookshelfController {
  constructor(private readonly bookshelfService: BookshelfService) {}

  @Get()
  getMyShelf(@Request() req) {
    return this.bookshelfService.getMyBookshelf(req.user.userId);
  }

  @Post()
  addItem(@Request() req, @Body() body: { bookId: string; status: ShelfStatus }) {
    return this.bookshelfService.addBook(req.user.userId, body.bookId, body.status);
  }
}
