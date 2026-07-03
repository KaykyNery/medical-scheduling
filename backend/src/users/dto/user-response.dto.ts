import { Exclude, Expose } from 'class-transformer';
import { Role, User } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto implements Partial<User> {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'patient@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ example: 'João da Silva' })
  @Expose()
  name: string;

  @ApiProperty({ example: '+5511999999999', nullable: true })
  @Expose()
  phone: string | null;

  @ApiProperty({ enum: Role })
  @Expose()
  role: Role;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @Exclude()
  passwordHash: string;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
