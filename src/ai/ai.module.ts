import { Module } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { RagService } from './rag.service';
import { AiController } from './ai.controller'; // Added
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AiController], // Added
  providers: [OllamaService, RagService],
  exports: [OllamaService, RagService],
})
export class AiModule {}
