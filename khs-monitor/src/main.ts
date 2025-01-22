import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import fs from "fs";
import pRetry, { AbortError } from "p-retry";
import parseKhs, { KHS } from "./lib/parseKhs.js";

dotenv.config();

const LOGIN_PAGE_URL = "https://ais.unmul.ac.id";
const LOGIN_POST_URL = "https://ais.unmul.ac.id/login/check";
const KHS_URL = "https://ais.unmul.ac.id/mahasiswa/khs";
const KHS_DETAIL_URL = "https://ais.unmul.ac.id/mahasiswa/khs/detail/";

const CURRENT_SEMESTER = process.env.CURRENT_SEMESTER;

if (!CURRENT_SEMESTER) {
    console.error("Please set CURRENT_SEMESTER environment first.");
    process.exit();
}

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
                            {
                                name: "Predikat",
                                value: `${data.new!.nilaiHuruf}`,
                            },
                            {
                                name: "Bobot",
                                value: `${data.new!.bobot}`,
                            },
                            {
                                name: "SKS x Bobot",
                                value: `${data.new!.sksxbobot}`,
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

async function sendWithWhatsappWebhook(data: { old: KHS; new: KHS }) {
    const WHATSAPP_WEBHOOK_URL = process.env.WHATSAPP_WEBHOOK_URL;

    const message = `*${data.old.matakuliah}*

Nilai: ${data.old!.nilaiAngka} -> ${data.new!.nilaiAngka}
Predikat: ${data.new!.nilaiHuruf}
Bobot: ${data.new!.bobot}
SKS x Bobot: ${data.new!.sksxbobot}`;

    if (WHATSAPP_WEBHOOK_URL) {
        const config = {
            method: "POST",
            url: WHATSAPP_WEBHOOK_URL,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data: { message },
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

        const khsList = $(".inbox-data.lihat");
        let idx;
        for (let i = 0; i < khsList.length; i++) {
            const $khs = cheerio.load(khsList[i]);
            const semester = $khs(".inbox-message > .email-data > span").text();
            if (semester === CURRENT_SEMESTER) {
                idx = i;
                break;
            }
        }

        const key = $(khsList[idx!]).attr("data-key");

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

export async function saveKHS() {
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
            const datetime = new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            }).format(new Date());

            console.log(`[${datetime}] ${data.new.matakuliah} has changed.`);
            sendWithWhatsappWebhook(data);
            sendWithDiscordWebhook(data);
        }
    }
}
