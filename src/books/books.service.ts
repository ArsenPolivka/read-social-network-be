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
    
    // Logic: If a key exists, append it. If not, don't send the 'key' param at all.
    // (Google Books API works for public searches without a key, but with lower rate limits)
    
    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;
    
    if (apiKey) {
      url += `&key=${apiKey}`;
    }

    try {
      const { data } = await firstValueFrom(this.httpService.get(url));
      
      if (!data.items) return [];

      return data.items.map((item: any) => ({
        googleBookId: item.id,
        title: item.volumeInfo.title,
        author: item.volumeInfo.authors?.[0] || 'Unknown',
        coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
        publishedYear: item.volumeInfo.publishedDate?.substring(0, 4),
      }));
    } catch (error) {
      console.error("Google Books API Error:", error.response?.data || error.message);
      // Return empty array instead of crashing
      return [];
    }
  }

  // 2. Get Book Details (Checks DB first, then Google)
  async getBookDetails(googleBookId: string) {
    // Check cache
    const existing = await this.prisma.book.findUnique({ where: { googleBookId } });
    if (existing) return existing;

    // Fetch and Cache
    const url = `https://www.googleapis.com/books/v1/volumes/${googleBookId}`;
    const { data } = await firstValueFrom(this.httpService.get(url));
    const info = data.volumeInfo;

    return this.prisma.book.create({
      data: {
        googleBookId: data.id,
        title: info.title,
        author: info.authors?.[0] || 'Unknown',
        description: info.description, // HTML description
        coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:'),
        pageCount: info.pageCount || 0,
        publishedYear: parseInt(info.publishedDate?.substring(0, 4)) || null,
        genres: info.categories || [],
      },
    });
  }
}
