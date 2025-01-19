import { Exclude } from 'class-transformer';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { EUserRoles } from 'src/utils/enums';
import { Post } from 'src/posts/entities/post.entity';
import { Book } from 'src/books/entities/book.entity';

@Entity()
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  username: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ type: 'enum', enum: EUserRoles, default: EUserRoles.READER })
  role: EUserRoles;

  @Column({ default: '' })
  bio: string;

  @Column({ default: '' })
  avatarUrl: string;

  @OneToMany(() => Post, (post) => post.author, {
    cascade: true,
  })
  posts: Post[];

  @ManyToMany(() => Book, (book) => book.users, {
    cascade: true,
  })
  @JoinTable({
    name: 'users_books',
  })
  books: Book[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
