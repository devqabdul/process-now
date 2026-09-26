import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsPassword, IsText } from '../../common/validators.js';

export class LoginDto {
  /** Phone number or email */
  @IsText(254)
  @IsNotEmpty()
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

  @IsPassword()
  newPassword: string;
}
