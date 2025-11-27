import { Controller, Post, UploadedFile, UseInterceptors, UseGuards, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport'; // The guard we made
import { IngestionService } from './ingestion.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('ingestion')
export class IngestionController {
  constructor(
    private ingestionService: IngestionService,
    private prisma: PrismaService
  ) {}

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(@UploadedFile() file: Express.Multer.File, @Request() req) {
    // 1. Get Profile ID from User ID
    const profile = await this.prisma.profile.findUnique({
      where: { userId: req.user.userId }
    });
    
    // 2. Process
    return this.ingestionService.processFile(profile?.id!, file.buffer, file.originalname);
  }
}