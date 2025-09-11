
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { backupDatabase } from 'src/backup';

@Injectable()
export class CronService {
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async DBBackup() {
        await backupDatabase();
    }
}
