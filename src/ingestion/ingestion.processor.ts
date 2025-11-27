import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IngestionService } from './ingestion.service';
import { Logger } from '@nestjs/common';

@Processor('ingestion-queue')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(private readonly ingestionService: IngestionService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'process-pdf':
        this.logger.log(`Processing job ${job.id}: Analyzing PDF for book ${job.data.bookId}...`);
        
        try {
          // 1. Reconstruct Buffer from Base64 (queues store data as JSON strings)
          const fileBuffer = Buffer.from(job.data.fileBuffer, 'base64');
          
          // 2. Call the service to Parse -> Chunk -> Embed
          const result = await this.ingestionService.processFile(
            job.data.userId, // We used profileId in the service, but let's pass what we have
            fileBuffer,
            `Book-${job.data.bookId}` // Using generic name or title passed in job
          );

          this.logger.log(`Job ${job.id} completed! ${result.chunksProcessed} chunks created.`);
          return result;

        } catch (error) {
          this.logger.error(`Job ${job.id} failed`, error);
          throw error;
        }
        
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}