import { IsNotEmpty, IsString } from "class-validator";

export class ProcessImageDto {
    @IsString()
    @IsNotEmpty()
    clerkId: string;
}
