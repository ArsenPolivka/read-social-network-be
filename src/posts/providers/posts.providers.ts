import { DataSource } from 'typeorm';
import { ERepository } from 'src/utils/enums';
import { Post } from '../entities/post.entity';

export const postProviders = [
  {
    provide: ERepository.POST_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Post),
    inject: ['DATA_SOURCE'],
  },
];
