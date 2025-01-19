import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

import { ERepository } from 'src/utils/enums';
import { Book } from 'src/books/entities/book.entity';

@Injectable()
export class UsersService {
  private readonly saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

  constructor(
    @Inject(ERepository.USER_REPOSITORY)
    private userRepository: Repository<User>,

    @Inject(ERepository.BOOK_REPOSITORY)
    private bookRepository: Repository<Book>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const newUser = this.userRepository.create({
      ...createUserDto,
      password: await this.hashPassword(createUserDto.password),
    });

    const savedUser = await this.userRepository.save(newUser);

    return plainToInstance(User, savedUser);
  }

  async findAll(): Promise<User[]> {
    const users = await this.userRepository.find();
    return plainToInstance(User, users);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return plainToInstance(User, user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({ where: { id } });
    if (!existingUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    if (updateUserDto.password) {
      updateUserDto.password = await this.hashPassword(updateUserDto.password);
    }

    Object.assign(existingUser, updateUserDto);

    const updatedUser = await this.userRepository.save(existingUser);
    return plainToInstance(User, updatedUser);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async addBookToUser(userId: string, bookId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['books'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const book = await this.bookRepository.findOne({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException(`Book with ID "${bookId}" not found`);
    }

    if (!user.books.find((b) => b.id === bookId)) {
      user.books.push(book);
      return this.userRepository.save(user);
    }

    return user;
  }

  async removeBookFromUser(userId: string, bookId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['books'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    user.books = user.books.filter((book) => book.id !== bookId);
    return this.userRepository.save(user);
  }

  async findBooksOfUser(userId: string): Promise<Book[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['books'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    return user.books;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async comparePasswords(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
