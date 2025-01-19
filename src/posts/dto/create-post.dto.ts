import { IsString, IsUUID, IsInt, IsOptional, Min } from 'class-validator';

export class CreatePostDto {
  @IsUUID()
  authorId: string;

  @IsUUID()
  bookId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  rating?: number;
}
