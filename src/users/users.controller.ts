import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post(':userId/books/:bookId')
  async addBookToUser(
    @Param('userId') userId: string,
    @Param('bookId') bookId: string
  ) {
    return this.usersService.addBookToUser(userId, bookId);
  }

  @Delete(':userId/books/:bookId')
  async removeBookFromUser(
    @Param('userId') userId: string,
    @Param('bookId') bookId: string
  ) {
    return this.usersService.removeBookFromUser(userId, bookId);
  }

  @Get(':userId/books')
  async getBooksOfUser(@Param('userId') userId: string) {
    return this.usersService.findBooksOfUser(userId);
  }
}
