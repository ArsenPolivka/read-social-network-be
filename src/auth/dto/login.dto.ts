import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Password must contain at least one letter and one number.',
  })
  password: string;
}
