import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq'; // <--- Import this

// Core Modules
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AiModule } from './ai/ai.module';
import { IngestionModule } from './ingestion/ingestion.module';

// Feature Modules
import { ProfileModule } from './profile/profile.module';
import { BookshelfModule } from './bookshelf/bookshelf.module';
import { TrackerModule } from './tracker/tracker.module';
import { SocialModule } from './social/social.module';

// Simple Controllers
import { BooksController } from './books/books.controller';
import { BooksService } from './books/books.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    
    // Add the Root BullMQ Configuration here
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),

    // Infrastructure
    AuthModule,
    PrismaModule,
    
    // AI Engine
    AiModule,
    IngestionModule,
    
    // Application Features
    ProfileModule,
    BookshelfModule,
    TrackerModule,
    SocialModule,
  ],
  controllers: [AppController, BooksController],
  providers: [AppService, BooksService],
})
export class AppModule {}
