import { IsNotEmpty, IsString, IsEmail, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AvailabilityItemDto } from './create-professional.dto';

export class UpdateProfessionalDto {
  @ApiProperty({ example: 'Dr. House' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'house@clinic.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '(11) 99999-9999' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Infectologia' })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiProperty({ example: 'CRM/SP 123456' })
  @IsString()
  @IsOptional()
  registrationId?: string;

  @ApiProperty({ type: [AvailabilityItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityItemDto)
  @IsOptional()
  availabilities?: AvailabilityItemDto[];
}
