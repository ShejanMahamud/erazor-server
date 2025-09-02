import { IsDate, IsNotEmpty, IsString } from "class-validator";

export class CreateLoginHistoryDto {
    @IsString()
    @IsNotEmpty()
    userId: string;
    @IsDate()
    @IsNotEmpty()
    lastSignInAt: Date;
    @IsString()
    @IsNotEmpty()
    sessionId: string;

    @IsString()
    @IsNotEmpty()
    ipAddress: string;

    @IsString()
    @IsNotEmpty()
    userAgent: string;
}