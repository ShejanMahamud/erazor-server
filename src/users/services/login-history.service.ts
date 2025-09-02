import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "src/prisma/prisma.service";
import { IGlobalRes } from "src/types";
import { CreateLoginHistoryDto } from "../dto/create-login-history.dto";
import { UpdateLoginHistoryDto } from "../dto/update-login-history.dto";
import { ILoginHistory, ILoginHistoryService } from "../interfaces/login-history.interface";

@Injectable()
export class LoginHistoryService implements ILoginHistoryService {

    constructor(private readonly prisma: PrismaService) {

    }

    async findLoginHistoryByUserId(userId: string): Promise<IGlobalRes<ILoginHistory[]>> {
        const loginHistory = await this.prisma.loginHistory.findMany({
            where: { userId },
        });
        return { success: true, message: "Login history retrieved successfully", data: loginHistory };
    }

    async findAllLoginHistory(): Promise<IGlobalRes<ILoginHistory[]>> {
        const loginHistory = await this.prisma.loginHistory.findMany();
        return { success: true, message: "All login history retrieved successfully", data: loginHistory };
    }

    async createLoginHistory(data: CreateLoginHistoryDto, req: Request): Promise<IGlobalRes<ILoginHistory> | any> {
        // Always create a new login history record for better audit trail
        const loginHistory = await this.prisma.loginHistory.create({
            data: {
                ...data,
            },
        });
        return { success: true, message: "Login history created successfully", data: loginHistory };
    }

    async updateLoginHistory(id: string, data: Partial<UpdateLoginHistoryDto>): Promise<IGlobalRes<ILoginHistory | null>> {
        const loginHistory = await this.prisma.loginHistory.update({
            where: { id },
            data,
        });
        return { success: true, message: "Login history updated successfully", data: loginHistory };
    }
}
