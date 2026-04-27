import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'founder@example.com', maxLength: 254 })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    minLength: 12,
    maxLength: 128,
    example: 'Str0ng-Passw0rd!',
    description:
      'At least 12 characters with one letter, one digit, and one symbol.',
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[A-Za-z]/, { message: 'password must contain a letter' })
  @Matches(/\d/, { message: 'password must contain a digit' })
  @Matches(/[^A-Za-z0-9]/, { message: 'password must contain a symbol' })
  password!: string;

  @ApiPropertyOptional({ example: 'Abanoub Essam', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
