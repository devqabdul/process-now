import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  /** Phone number or email */
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  identifier: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72) // bcrypt ignores bytes past 72
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}
