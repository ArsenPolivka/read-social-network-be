import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IngestionService } from './ingestion.service';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Processor('ingestion-queue')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private readonly ingestionService: IngestionService,
    private readonly prisma: PrismaService
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'process-pdf':
        this.logger.log(`Processing job ${job.id} for file: ${job.data.filename}`);
        
        // 1. Get the Storage Path (NOT filePath)
        const storagePath = job.data.storagePath;

        if (!storagePath) {
          throw new Error('Job payload missing "storagePath"');
        }

        try {
          // 2. Download File from Supabase (Buffer in memory)
          const fileBuffer = await this.ingestionService.getFileBuffer(storagePath);
          
          // 3. Find Profile
          const profile = await this.prisma.profile.findUnique({
             where: { userId: job.data.userId }
          });

          if (!profile) throw new Error("Profile not found");

          // 4. Process (Parse -> Vectorize -> Save DB)
          const result = await this.ingestionService.processFile(
            profile.id,
            fileBuffer,
            job.data.filename,
            storagePath, // Save the remote path to DB
            job.data.bookId
          );

          this.logger.log(`Job ${job.id} completed!`);
          return result;

        } catch (error) {
          this.logger.error(`Job ${job.id} failed: ${error.message}`);
          throw error;
        }
        
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}