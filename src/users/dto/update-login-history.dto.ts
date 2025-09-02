import { PartialType } from "@nestjs/mapped-types";
import { IsNumber, IsOptional } from "class-validator";
import { CreateLoginHistoryDto } from "./create-login-history.dto";

export class UpdateLoginHistoryDto extends PartialType(CreateLoginHistoryDto) {
    @IsNumber()
    @IsOptional()
    failedAttempt: number;
}