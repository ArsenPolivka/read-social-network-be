import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Book } from './entities/book.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { User } from 'src/users/entities/user.entity';
import { ERepository } from 'src/utils/enums';

@Injectable()
export class BooksService {
  constructor(
    @Inject(ERepository.BOOK_REPOSITORY)
    private booksRepository: Repository<Book>,

    @Inject(ERepository.USER_REPOSITORY)
    private usersRepository: Repository<User>,
  ) {}

  async create(createBookDto: CreateBookDto): Promise<Book> {
    const book = this.booksRepository.create(createBookDto);
    return this.booksRepository.save(book);
  }

  async findAll(): Promise<Book[]> {
    return this.booksRepository.find();
  }

  async findOne(id: string): Promise<Book> {
    const book = await this.booksRepository.findOne({ where: { id } });
    if (!book) {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }
    return book;
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<Book> {
    const book = await this.findOne(id);
    Object.assign(book, updateBookDto);
    return this.booksRepository.save(book);
  }

  async remove(id: string): Promise<void> {
    const book = await this.findOne(id);
    await this.booksRepository.remove(book);
  }

  async findBooksOfUser(userId: string): Promise<Book[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['books'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    return user.books;
  }
}
