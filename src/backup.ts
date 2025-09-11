import axios from "axios";
import { exec } from "child_process";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function backupDatabase(): Promise<void> {
    try {
        const date = new Date().toISOString().replace(/[:.]/g, "-");
        const backupFile = path.join("/tmp", `erazor_backup_${date}.sql.gz`);

        // Dump + compress
        const dumpCmd = `PGPASSWORD=${process.env.POSTGRES_PASSWORD} pg_dump -h ${process.env.POSTGRES_HOST} -p ${process.env.POSTGRES_PORT} -U ${process.env.POSTGRES_USER} ${process.env.POSTGRES_DB} | gzip > ${backupFile}`;
        await execAsync(dumpCmd);

        console.log(`Backup created: ${backupFile}`);
        // --- Send to Telegram ---
        if (process.env.TG_BOT_TOKEN && process.env.TG_CHAT_ID) {
            const tgUrl = `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendDocument`;
            const tgForm = new FormData();
            tgForm.append("chat_id", process.env.TG_CHAT_ID);
            tgForm.append("caption", `Erazor DB Backup ${date}`);
            tgForm.append("document", fs.createReadStream(backupFile));

            await axios.post(tgUrl, tgForm, { headers: tgForm.getHeaders() });
            console.log("Sent to Telegram");
        }

        fs.unlinkSync(backupFile); // cleanup
    } catch (err: any) {
        console.error("Backup failed:", err.message);
    }
}
