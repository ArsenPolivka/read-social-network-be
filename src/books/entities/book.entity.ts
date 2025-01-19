import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
} from 'typeorm';
import { Post } from 'src/posts/entities/post.entity';
import { User } from 'src/users/entities/user.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ default: '' })
  author: string;

  @Column({ default: '' })
  description: string;

  @Column()
  publicationYear: number;

  @OneToMany(() => Post, (post) => post.book)
  posts: Post[];

  @ManyToMany(() => User, (user) => user.books)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
