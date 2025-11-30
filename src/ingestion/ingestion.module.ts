import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IngestionController } from './ingestion.controller';
import { IngestionProcessor } from './ingestion.processor';
import { IngestionService } from './ingestion.service'; // <--- 1. Import this
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ingestion-queue',
    }),
    AiModule,
    AuthModule,
  ],
  controllers: [IngestionController],
  // 2. Add IngestionService to the providers array below
  providers: [IngestionService, IngestionProcessor], 
})
export class IngestionModule {}