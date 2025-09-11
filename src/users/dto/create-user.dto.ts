import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { VerificationStatus } from 'generated/prisma';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    id: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsString()
    @IsNotEmpty()
    imageUrl: string;

    @IsEnum(VerificationStatus)
    @IsNotEmpty()
    verified: VerificationStatus;
}