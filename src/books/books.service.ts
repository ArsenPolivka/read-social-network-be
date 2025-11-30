import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BooksService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  // 1. Search Google Books API
  async search(query: string) {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    
    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`;
    
    if (apiKey) {
      url += `&key=${apiKey}`;
    }

    try {
      const { data } = await firstValueFrom(this.httpService.get(url));
      
      if (!data.items) return [];

      return data.items.map((item: any) => this.mapGoogleBookToResponse(item));
    } catch (error) {
      console.error("Google Books API Error:", error.response?.data || error.message);
      return [];
    }
  }

  // 2. Get Suggestions based on User Shelf
  async getSuggestions(userId: string) {
    // A. Get User's Bookshelf (Last 3 interacted items)
    const shelfItems = await this.prisma.bookshelfItem.findMany({
      where: { profile: { userId } },
      include: { book: true },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    });

    let query = 'subject:fiction'; // Default fallback (Popular/General)
    let source = 'popular';

    // B. Determine Strategy
    if (shelfItems.length > 0) {
      // Strategy 1: Pick the most recent book's author
      const lastBook = shelfItems[0].book;
      if (lastBook.author && lastBook.author !== 'Unknown') {
        query = `inauthor:${lastBook.author}`;
        source = 'author';
      } 
      // Strategy 2: Pick a genre from recent books
      else if (lastBook.genres.length > 0) {
        query = `subject:${lastBook.genres[0]}`;
        source = 'genre';
      }
    }

    // C. Fetch from Google Books
    const results = await this.search(query);

    // D. Filter out books user has already read/shelved
    const shelvedGoogleIds = new Set(shelfItems.map(i => i.book.googleBookId));
    const filtered = results.filter(b => !shelvedGoogleIds.has(b.googleBookId));

    return {
      source, // 'popular', 'author', 'genre' - helpful for UI titles like "Because you read X"
      books: filtered.slice(0, 10),
    };
  }

  // 3. Get Book Details
  async getBookDetails(idOrGoogleId: string) {
    // Check local by internal ID
    const byLocalId = await this.prisma.book.findUnique({ 
      where: { id: idOrGoogleId } 
    });
    if (byLocalId) return byLocalId;

    // Check local by Google ID
    const byGoogleId = await this.prisma.book.findUnique({ 
      where: { googleBookId: idOrGoogleId } 
    });
    if (byGoogleId) return byGoogleId;

    // Fetch from API
    const url = `https://www.googleapis.com/books/v1/volumes/${idOrGoogleId}`;
    try {
        const { data } = await firstValueFrom(this.httpService.get(url));
        const info = data.volumeInfo;

        return this.prisma.book.create({
          data: {
            googleBookId: data.id,
            title: info.title,
            author: info.authors?.[0] || 'Unknown',
            description: info.description,
            coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:'),
            pageCount: info.pageCount || 0,
            publishedYear: parseInt(info.publishedDate?.substring(0, 4)) || null,
            genres: info.categories || [],
          },
        });
    } catch (error) {
        return null; 
    }
  }

  private mapGoogleBookToResponse(item: any) {
    return {
      googleBookId: item.id,
      title: item.volumeInfo.title,
      author: item.volumeInfo.authors?.[0] || 'Unknown',
      coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
      publishedYear: item.volumeInfo.publishedDate?.substring(0, 4),
      categories: item.volumeInfo.categories || [],
    };
  }
}
