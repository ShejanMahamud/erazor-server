import type { Request } from "express";
import { IGlobalRes } from "src/types";
import { CreateLoginHistoryDto } from "../dto/create-login-history.dto";
import { UpdateLoginHistoryDto } from "../dto/update-login-history.dto";

export interface ILoginHistory {
    id: string;
    userId: string;
    ipAddress: string;
    userAgent: string;
    sessionId: string;
    failedAttempt: number;
    lastSignInAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ILoginHistoryService {
    findLoginHistoryByUserId(userId: string): Promise<IGlobalRes<ILoginHistory[]>>;
    findAllLoginHistory(): Promise<IGlobalRes<ILoginHistory[]>>;
    createLoginHistory(data: CreateLoginHistoryDto, req: Request): Promise<IGlobalRes<ILoginHistory>>;
    updateLoginHistory(id: string, data: Partial<UpdateLoginHistoryDto>): Promise<IGlobalRes<ILoginHistory | null>>;
}