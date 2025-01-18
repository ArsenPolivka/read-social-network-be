
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { ERepository } from 'src/utils/enums';

export const userProviders = [
  {
    provide: ERepository.USER_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(User),
    inject: ['DATA_SOURCE'],
  },
];
