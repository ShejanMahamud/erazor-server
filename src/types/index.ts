export interface IGlobalRes<T = any, Q = any> {
    success: boolean;
    message: string;
    data?: T;
    meta?: Q;
}

export interface IGlobalMeta {
    limit: number;
    count: number;
    hasNextPage: boolean;
    nextCursor: string | null
}