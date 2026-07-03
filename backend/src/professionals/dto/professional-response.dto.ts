import { Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { Availability } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ProfessionalResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @Expose()
  userId: string;

  @ApiProperty({ example: 'Cardiologia' })
  @Expose()
  specialty: string;

  @ApiProperty({ example: 'CRM/SP 123456' })
  @Expose()
  registrationId: string;

  @ApiProperty({ example: true })
  @Expose()
  isActive: boolean;

  @ApiProperty({ type: () => UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  user?: UserResponseDto;

  @ApiProperty()
  @Expose()
  availabilities?: Availability[];

  constructor(partial: any) {
    if (partial) {
      this.id = partial.id;
      this.userId = partial.userId;
      this.specialty = partial.specialty;
      this.registrationId = partial.registrationId;
      this.isActive = partial.isActive;
      this.availabilities = partial.availabilities;
      if (partial.user) {
        this.user = new UserResponseDto(partial.user);
      }
    }
  }
}
