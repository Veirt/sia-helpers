import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import fs from "fs";
import * as cron from "node-cron";
import pRetry, { AbortError } from "p-retry";
import parseKhs, { KHS } from "./parseKhs.js";
import { createHttpServer } from "./server.js";

dotenv.config();

const LOGIN_PAGE_URL = "https://ais.unmul.ac.id";
const LOGIN_POST_URL = "https://ais.unmul.ac.id/login/check";
const KHS_URL = "https://ais.unmul.ac.id/mahasiswa/khs";
const KHS_DETAIL_URL = "https://ais.unmul.ac.id/mahasiswa/khs/detail/";

async function sendWithDiscordWebhook(data: { old: KHS; new: KHS }) {
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
    if (DISCORD_WEBHOOK_URL) {
        const config = {
            method: "POST",
            url: DISCORD_WEBHOOK_URL,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({
                embeds: [
                    {
                        title: `${data.old.matakuliah}`,
                        fields: [
                            {
                                name: "Nilai",
                                value: `${data.old!.nilaiAngka} -> ${data.new!.nilaiAngka}`,
                            },
                        ],
                    },
                ],
            }),
        };

        try {
            await axios(config);
        } catch (err) {
            console.error(`Error when sending webhook: ${err}`);
        }
    }
}

async function getLoginCookie(): Promise<string> {
    console.log("Getting login cookie...");
    if (process.env.NIM === undefined || process.env.PASSWORD === undefined) {
        console.error("Please set environment variable NIM and PASSWORD first.");
        process.exit();
    }

    // getting the captcha
    const loginPage = await axios.get(LOGIN_PAGE_URL, {
        withCredentials: true,
    });
    const cookie = loginPage.headers["set-cookie"]!;
    const ci_session_cookie = cookie[0].split(";")[0];
    const $ = cheerio.load(loginPage.data);
    const captcha = $(".badge.badge-primary").html()!;

    // login
    const data = new FormData();
    data.append("login[username]", process.env.NIM);
    data.append("login[password]", process.env.PASSWORD);
    data.append("login[sc]", captcha);
    const loginResponse = await axios.post(LOGIN_POST_URL, data, {
        headers: {
            "Content-Type": "multipart/form-data",
            cookie: ci_session_cookie,
        },
    });

    if (!loginResponse.data.status) {
        throw new AbortError(`Login failed`);
    }

    fs.writeFileSync("data/cookie.txt", ci_session_cookie, "utf8");

    return ci_session_cookie;
}

async function fetchKHS() {
    let cookie;
    if (fs.existsSync("data/cookie.txt")) {
        cookie = fs.readFileSync("data/cookie.txt", "utf8").trim();
    } else {
        cookie = await pRetry(getLoginCookie, { retries: 3 });
    }

    // test if cookie is still valid. if not, getLoginCookie again.
    const khsPage = await axios.get(KHS_URL, {
        headers: { cookie },
    });
    if (khsPage.request._redirectable._redirectCount > 0) {
        console.log("Cookie is no longer valid.");
        cookie = await pRetry(getLoginCookie, { retries: 3 });
    }

    try {
        const khsPage = await axios.get(KHS_URL, {
            headers: { cookie },
        });

        const $ = cheerio.load(khsPage.data);

        // last child: newest, as of now. fix later if there is a new page
        const key = $(".inbox-data.lihat:last-child").attr("data-key");

        const khsDetail = await axios.get(`${KHS_DETAIL_URL}/${key}`, {
            headers: { cookie },
        });

        return khsDetail;
    } catch (err) {
        console.error(`Error when fetching khs: ${err}`);
    }
}

function checkKhsChanged(oldKHS: KHS[], newKHS: KHS[]): { old: KHS; new: KHS }[] {
    let changedData: { old: KHS; new: KHS }[] = [];

    for (const newKHSDetail of newKHS) {
        const oldKHSDetail = oldKHS.find((detail) => newKHSDetail.matakuliah === detail.matakuliah)!;

        if (newKHSDetail.nilaiAngka !== oldKHSDetail!.nilaiAngka) {
            changedData.push({ old: oldKHSDetail, new: newKHSDetail });
        }
    }

    return changedData;
}

async function saveKHS() {
    let response;
    try {
        response = await pRetry(() => fetchKHS(), { retries: 3 });
        if (!response) {
            throw new Error("Response is empty.");
        }
    } catch (err) {
        console.error(`Failed saving khs: ${err}`);
        return;
    }

    const khsExist = fs.existsSync("data/khs.html");
    if (!khsExist) {
        fs.writeFileSync("data/khs.html", response!.data.html, "utf8");
        return;
    }

    const newKHS = parseKhs(response!.data.html);
    const oldKHS = parseKhs(fs.readFileSync("data/khs.html", "utf8"));

    const changedData = checkKhsChanged(oldKHS, newKHS);
    const changed = changedData.length > 0;
    if (changed) {
        // things to handle when changed.
        fs.writeFileSync("data/khs.html", response!.data.html, "utf8");

        for (const data of changedData) {
            console.log(`${data.new.matakuliah} has changed.`);
            sendWithDiscordWebhook(data);
        }
    }
}

// run at the beginning
await saveKHS();
cron.schedule("*/30 6-23 * * *", async () => {
    console.log(`[${new Date().toLocaleString()}] Running CRON job.`);
    await saveKHS();
});

createHttpServer();
