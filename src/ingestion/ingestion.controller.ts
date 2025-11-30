import { Controller, Post, Get, UploadedFile, UseInterceptors, UseGuards, Request, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IngestionService } from './ingestion.service';
import * as fs from 'fs';
import * as path from 'path';
import { StreamableFile, Response } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller('ingestion')
@UseGuards(AuthGuard('jwt'))
export class IngestionController {
  constructor(
    @InjectQueue('ingestion-queue') private ingestionQueue: Queue,
    private ingestionService: IngestionService
  ) {
    // Create 'uploads' folder if it doesn't exist
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
  }

  @Get('uploads')
  async getMyUploads(@Request() req) {
    return this.ingestionService.getUserUploads(req.user.userId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    // 1. Generate unique filename
    const filename = `${Date.now()}-${file.originalname}`;
    const filePath = path.join('./uploads', filename);

    // 2. Write file to disk (Low memory usage)
    fs.writeFileSync(filePath, file.buffer);

    // 3. Send ONLY the path to the queue
    await this.ingestionQueue.add('process-pdf', {
      userId: req.user.userId,
      filePath: filePath, // <--- Key change
      filename: file.originalname,
    });

    return { status: 'queued', message: 'Book is being processed in the background.' };
  }

  @Get('file/:filename')
  @UseGuards(AuthGuard('jwt'))
  getFile(@Param('filename') filename: string): StreamableFile {
    // In a real app, verify the user owns this file via DB check first!
    const file = createReadStream(join(process.cwd(), 'uploads', filename));
    return new StreamableFile(file);
  }
}