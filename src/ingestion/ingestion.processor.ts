import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IngestionService } from './ingestion.service';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';

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
        
        const filePath = job.data.filePath;

        try {
          // 1. Check if file exists
          if (!fs.existsSync(filePath)) {
            throw new Error(`File not found at ${filePath}`);
          }

          // 2. Read file (Only loads into memory now, not during queueing)
          const fileBuffer = fs.readFileSync(filePath);
          
          // 3. Find Profile
          const profile = await this.prisma.profile.findUnique({
             where: { userId: job.data.userId }
          });

          if (!profile) throw new Error("Profile not found");

          // 4. Process
          const result = await this.ingestionService.processFile(
            profile.id,
            fileBuffer,
            job.data.filename
          );

          // 5. Cleanup: Delete file to save space
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            this.logger.warn(`Failed to delete temp file: ${filePath}`);
          }

          this.logger.log(`Job ${job.id} completed!`);
          return result;

        } catch (error) {
          this.logger.error(`Job ${job.id} failed: ${error.message}`);
          // Attempt cleanup on failure too
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          throw error;
        }
        
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}