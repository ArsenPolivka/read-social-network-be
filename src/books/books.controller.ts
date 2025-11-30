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
}