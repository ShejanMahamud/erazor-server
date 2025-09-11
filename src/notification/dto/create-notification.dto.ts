import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { NotificationTypes } from "generated/prisma";

export class CreateNotificationDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsEnum(NotificationTypes)
    @IsNotEmpty()
    type: NotificationTypes;

    @IsString()
    @IsNotEmpty()
    message: string;
}