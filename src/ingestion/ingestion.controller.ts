import { Controller, Post, Get, UploadedFile, UseInterceptors, UseGuards, Request, Body, Param, StreamableFile, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IngestionService } from './ingestion.service';
import type { Response } from 'express';

@Controller('ingestion')
export class IngestionController {
  constructor(
    @InjectQueue('ingestion-queue') private ingestionQueue: Queue,
    private ingestionService: IngestionService
  ) {}

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('bookId') bookId: string,
    @Request() req
  ) {
    // FIX ENCODING: Convert latin1 (default Multer) to utf8
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');

    // 1. Upload to Supabase Storage immediately
    const storagePath = await this.ingestionService.uploadToStorage(req.user.userId, file);

    // 2. Add to Queue (We pass the PATH, not the file itself)
    // This keeps Redis lightweight and fast.
    await this.ingestionQueue.add('process-pdf', {
      userId: req.user.userId,
      bookId: bookId, 
      storagePath: storagePath, // <--- Key change
      filename: file.originalname,
    });

    return { status: 'queued', message: 'Book uploaded and queued for processing.' };
  }

  @Get('file/*filename') // (*) allows capturing slashes in the path
  @UseGuards(AuthGuard('jwt'))
  async getFile(@Param('filename') path: string, @Res({ passthrough: true }) res: Response) {
    // 1. Fetch file buffer from Supabase
    // Note: 'path' here will be the storage path e.g., "user_123/1739...pdf"
    // The frontend sends this path when requesting the file.
    
    // However, our frontend currently sends just a filename because of how we mocked it previously.
    // If we want to support the "Read" button, we need to fetch the *actual* path from the DB 
    // or pass the full path from the frontend.
    
    // Let's assume the frontend passes the FULL storage path (encoded).
    
    try {
      const fileBuffer = await this.ingestionService.getFileBuffer(path);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="book.pdf"`,
      });

      return new StreamableFile(fileBuffer);
    } catch (e) {
      throw new NotFoundException("File not found in storage");
    }
  }
}