import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MinLength, IsEnum, Matches, IsNotEmpty } from 'class-validator';
import { EUserRoles } from 'src/utils/enums';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, description: 'Must contain letters and numbers.' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Password must contain at least one letter and one number.',
  })
  password: string;

  @ApiProperty({ minLength: 8, description: 'Matches password' })
  @IsNotEmpty()
  passwordConfirmation: string;

  @ApiProperty({ enum: EUserRoles })
  @IsEnum(EUserRoles)
  role?: EUserRoles;

  @ApiProperty()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
