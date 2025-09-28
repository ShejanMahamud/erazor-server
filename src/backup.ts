import axios from "axios";
import { exec } from "child_process";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function backupDatabase(): Promise<void> {
    let backupFile: string | null = null;

    try {
        const date = new Date().toISOString().replace(/[:.]/g, "-");
        backupFile = path.join("/tmp", `erazor_backup_${date}.sql.gz`);

        // Dump + compress
        const dumpCmd = `PGPASSWORD=${process.env.POSTGRES_PASSWORD} pg_dump -h ${process.env.POSTGRES_HOST} -p ${process.env.POSTGRES_PORT} -U ${process.env.POSTGRES_USER} ${process.env.POSTGRES_DB} | gzip > ${backupFile}`;
        await execAsync(dumpCmd);

        // Check if backup file exists and has content
        if (!fs.existsSync(backupFile)) {
            throw new Error("Backup file was not created");
        }

        const stats = fs.statSync(backupFile);
        if (stats.size === 0) {
            throw new Error("Backup file is empty");
        }

        // --- Send to Telegram ---
        if (process.env.TG_BOT_TOKEN && process.env.TG_CHAT_ID) {
            try {
                const tgUrl = `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendDocument`;
                const tgForm = new FormData();
                tgForm.append("chat_id", process.env.TG_CHAT_ID);
                tgForm.append("caption", `Erazor DB Backup ${date}\n Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                tgForm.append("document", fs.createReadStream(backupFile));

                await axios.post(tgUrl, tgForm, {
                    headers: tgForm.getHeaders(),
                    timeout: 60000, // 60 seconds timeout
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity
                });

            } catch (telegramError: any) {
                if (telegramError.code === 'ETIMEDOUT' || telegramError.code === 'ENETUNREACH') {
                    console.error("Network connection timeout - Telegram servers may be unreachable");
                } else if (telegramError.response?.status === 413) {
                    console.error("File too large for Telegram (max 50MB)");
                } else if (telegramError.response?.status === 400) {
                    console.error("Invalid bot token or chat ID");
                } else {
                    console.error(`Error details: ${telegramError.message}`);
                }
            }
        } else {
            console.log("Telegram credentials not configured - skipping upload");
        }

        // Cleanup
        if (backupFile && fs.existsSync(backupFile)) {
            fs.unlinkSync(backupFile);
        }
    } catch (err: any) {
        if (err.message?.includes('pg_dump')) {
            console.error("Database connection or pg_dump error");
        } else if (err.message?.includes('gzip')) {
            console.error("Compression error");
        } else {
            console.error(`Error details: ${err.message}`);
        }

        // Cleanup on error
        if (backupFile && fs.existsSync(backupFile)) {
            try {
                fs.unlinkSync(backupFile);
            } catch (cleanupError) {
                console.error("Failed to cleanup backup file:", cleanupError);
            }
        }

        throw err;
    }
}
