import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from 'src/users/entities/user.entity';
import { Book } from 'src/books/entities/book.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.posts, {
    onDelete: 'CASCADE',
  })
  author: User;

  @ManyToOne(() => Book, (book) => book.posts, {
    onDelete: 'CASCADE',
  })
  book: Book;

  @Column('text')
  content: string;

  @Column({ type: 'int', default: 0 })
  rating: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
