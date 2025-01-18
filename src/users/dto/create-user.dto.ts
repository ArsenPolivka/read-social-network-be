import { IsString, IsEmail, IsOptional, MinLength, IsEnum, Matches, IsNotEmpty } from 'class-validator';
import { EUserRoles } from 'src/utils/enums';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Password must contain at least one letter and one number.',
  })
  password: string;

  @IsNotEmpty()
  passwordConfirmation: string;

  @IsEnum(EUserRoles)
  role?: EUserRoles;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
