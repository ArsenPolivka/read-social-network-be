import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ERepository } from 'src/utils/enums';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class PostsService {

  constructor(
    @Inject(ERepository.POST_REPOSITORY)
    private postsRepository: Repository<Post>,

    @Inject(ERepository.USER_REPOSITORY)
    private usersRepository: Repository<User>,
  ){}

  async create(createPostDto: CreatePostDto): Promise<Post> {
    const { authorId, bookId, ...rest } = createPostDto;

    const post = this.postsRepository.create({
      ...rest,
      author: { id: authorId },
      book: { id: bookId },
    });

    return this.postsRepository.save(post);
  }

  async findAll(): Promise<Post[]> {
    return this.postsRepository.find({
      relations: ['author', 'book'],
    });
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['author', 'book'],
    });

    if (!post) {
      throw new NotFoundException(`Post with ID "${id}" not found.`);
    }

    return post;
  }

  async update(id: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);
    Object.assign(post, updatePostDto);

    return this.postsRepository.save(post);
  }

  async remove(id: string): Promise<void> {
    const post = await this.findOne(id);
    await this.postsRepository.remove(post);
  }

  async findPostsOfUser(userId: string): Promise<Post[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['posts'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    return user.posts;
  }
}
