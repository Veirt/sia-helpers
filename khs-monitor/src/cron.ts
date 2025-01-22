import * as cron from "node-cron";
import { saveKHS } from "./main.js";

const expression = "*/30 * * * *";
console.log(`Scheduling CRON: ${expression}`);

cron.schedule(expression, async () => {
    const datetime = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(new Date());
    console.log(`[${datetime}] Running CRON job.`);

    await saveKHS();
});
