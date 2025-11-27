import { Controller, Get, Query, Param, BadRequestException } from '@nestjs/common';
import { BooksService } from './books.service';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  // Endpoint: GET /books/search?q=Harry+Potter
  // Public access: Anyone can search for books
  @Get('search')
  async search(@Query('q') query: string) {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }
    return this.booksService.search(query);
  }

  // Endpoint: GET /books/:id
  // Usage: The frontend passes the Google Book ID (e.g. "wrOQLV6xB-wC")
  // Public access: Anyone can view book details
  @Get(':id')
  async getBookDetails(@Param('id') googleBookId: string) {
    return this.booksService.getBookDetails(googleBookId);
  }
}