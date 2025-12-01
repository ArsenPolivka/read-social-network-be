import { Controller, Get, Query, Param, BadRequestException, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BooksService } from './books.service';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }
    return this.booksService.search(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('suggestions')
  async getSuggestions(@Request() req) {
    return this.booksService.getSuggestions(req.user.userId);
  }

  @Get(':id')
  async getBookDetails(@Param('id') googleBookId: string) {
    return this.booksService.getBookDetails(googleBookId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/file-status')
  async checkFileStatus(@Request() req, @Param('id') bookId: string) {
    return this.booksService.checkFileStatus(req.user.userId, bookId);
  }
}