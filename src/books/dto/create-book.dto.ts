import { IsString, IsOptional, IsNotEmpty, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookDto {
  @ApiProperty({
    description: 'Title of the book',
    example: 'The Great Gatsby',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Author of the book',
    example: 'F. Scott Fitzgerald',
  })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({
    description: 'Short summary or description of the book',
    example: 'A novel set in the Roaring Twenties...',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Year of publication',
    example: 1925,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  publicationYear?: number;
}
