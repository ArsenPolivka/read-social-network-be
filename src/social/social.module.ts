import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { MessagesService } from './messages.service'; // Add
import { MessagesController } from './messages.controller'; // Add
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SocialController, MessagesController], // Add
  providers: [SocialService, MessagesService], // Add
})
export class SocialModule {}