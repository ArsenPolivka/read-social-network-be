import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 1. Define connection string
    const connectionString = `${process.env.DATABASE_URL}`;

    // 2. Reuse existing global pool in development to prevent "Max Clients" error
    const globalPool = (global as any).pgPool;
    let pool;

    if (!globalPool) {
      pool = new Pool({ connectionString, max: 10 }); // Explicitly limit pool size
      if (process.env.NODE_ENV !== 'production') {
        (global as any).pgPool = pool;
      }
    } else {
      pool = globalPool;
    }

    // 3. Create Adapter
    const adapter = new PrismaPg(pool);

    // 4. Initialize Parent
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    // In dev, don't close the pool on hot-reload, or the next reload will fail
    if (process.env.NODE_ENV === 'production') {
       await this.$disconnect();
    }
  }
}