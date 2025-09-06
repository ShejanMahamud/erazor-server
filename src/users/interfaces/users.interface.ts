import { Roles, VerificationStatus } from 'generated/prisma';
import { IGlobalMeta, IGlobalRes } from '../../types/index';
import { CreateUserDto } from "../dto/create-user.dto";
import { UpdateUserDto } from "../dto/update-user.dto";

export interface IUser {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    imageUrl: string;
    verified: VerificationStatus;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserService {
    createUser(dto: CreateUserDto): Promise<IGlobalRes<IUser>>;
    findUserById(id: string): Promise<IGlobalRes<IUser | null>>;
    findAllUsers(limit: number, cursor?: string, search?: string, verificationStatus?: VerificationStatus, isBlocked?: boolean, isDeleted?: boolean): Promise<IGlobalRes<IUser[], IGlobalMeta>>;
    updateUser(id: string, dto: UpdateUserDto): Promise<IGlobalRes<IUser | null>>;
    changeRole(id: string, role: Roles): Promise<IGlobalRes<IUser | null>>;
}