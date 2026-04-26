import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'founder@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 6, example: 'password123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: 'Abanoub Essam' })
  @IsOptional()
  @IsString()
  name?: string;
}
