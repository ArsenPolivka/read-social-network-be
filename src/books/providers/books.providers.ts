import { DataSource } from 'typeorm';
import { Book } from '../entities/book.entity';
import { ERepository } from 'src/utils/enums';

export const bookProviders = [
  {
    provide: ERepository.BOOK_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Book),
    inject: ['DATA_SOURCE'],
  },
];
