import axios, { AxiosError } from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import fs from "fs";
import * as cron from "node-cron";
import pRetry, { AbortError } from "p-retry";
import parseTranscript from "./parseTranscript.js";
import { createHttpServer } from "./server.js";

dotenv.config();

const LOGIN_PAGE_URL = "https://sia.unmul.ac.id/login";
const LOGIN_POST_URL = "https://sia.unmul.ac.id/loginpros";

async function sendWithDiscordWebhook(content: object) {
  const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
  if (DISCORD_WEBHOOK_URL) {
    const config = {
      method: "POST",
      url: DISCORD_WEBHOOK_URL,
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify(content),
    };

    try {
      await axios(config);
    } catch (err) {
      console.error(`Error when sending webhook: ${err}`);
    }
  }
}

function saveLoginCookie(cookie: string) {
  fs.writeFileSync("data/cookie.txt", cookie, "utf8");
}

async function getLoginCookie() {
  console.log("Getting login cookie...");
  if (process.env.NIM === undefined || process.env.PASSWORD === undefined) {
    console.error("Please set environment variable NIM and PASSWORD first.");
    process.exit();
  }

  const loginPage = await axios.get(LOGIN_PAGE_URL, {
    withCredentials: true,
  });
  const cookie = loginPage.headers["set-cookie"]!;
  const ci_session_cookie = cookie[0].split(";")[0];

  const $ = cheerio.load(loginPage.data);
  const captcha = $("div.form-group:nth-child(3) > div:nth-child(1)").html()!;
  const data = new FormData();
  data.append("usr", process.env.NIM);
  data.append("pwd", process.env.PASSWORD);
  data.append("sc", captcha);

  const loginResponse = await axios.post(LOGIN_POST_URL, data, {
    headers: {
      "Content-Type": "multipart/form-data",
      cookie: ci_session_cookie,
    },
  });

  if (loginResponse.headers.refresh === "0;url=https://sia.unmul.ac.id/login") {
    throw new AbortError(`Login failed`);
  }

  saveLoginCookie(ci_session_cookie);
}

async function fetchTranscript(cookie: string) {
  try {
    const response = await axios.get(
      "https://sia.unmul.ac.id/mhstranskrip/loaddatas",
      {
        headers: { cookie },
      }
    );

    return response;
  } catch (err) {
    if (err instanceof AxiosError) {
      if (err.response?.status) {
        throw new AbortError(`Status code error: ${err.response.statusText}`);
      }

      throw new Error(err.message);
    }
  }
}

async function saveTranscript() {
  const cookieExist = fs.existsSync("data/cookie.txt");
  if (!cookieExist) {
    await pRetry(getLoginCookie, { retries: 3 });
  }

  const cookie = fs.readFileSync("data/cookie.txt", "utf8").trim();

  let response;
  try {
    response = await pRetry(() => fetchTranscript(cookie), { retries: 3 });
    if (!response) {
      throw new Error("Response is empty.");
    }

    if (response.headers.refresh === "0;url=https://sia.unmul.ac.id/login") {
      console.log("Getting cookies and retrying request...");
      await pRetry(getLoginCookie, { retries: 3 });

      response = await fetchTranscript(cookie);
    }
  } catch (err) {
    console.error("Failed fetching transcript.");
    console.error(err);
    return;
  }

  const transcriptHtmlExist = fs.existsSync("data/transcript.html");
  let changed = false;

  if (transcriptHtmlExist) {
    const oldTranscript = parseTranscript(
      fs.readFileSync("data/transcript.html", "utf8")
    );
    const newTranscript = parseTranscript(response!.data);

    for (const newData of newTranscript) {
      const oldData = oldTranscript.find(
        (oldData) => oldData.matakuliah === newData.matakuliah
      );

      const isSame = newData.keterangan === oldData?.keterangan;
      if (!isSame) {
        // that means something has changed
        console.log(`${newData.matakuliah} has changed.`);

        sendWithDiscordWebhook({
          embeds: [
            {
              title: `${newData.matakuliah}`,
              fields: [
                {
                  name: "Nilai",
                  value: `${oldData!.nilai_angka || 0} -> ${newData!.nilai_angka
                    }`,
                },
              ],
              footer: {
                text: `${newData!.keterangan}`,
              },
            },
          ],
        });

        changed = true;
      }
    }
  } else {
    fs.writeFileSync("data/transcript.html", response!.data, "utf8");
    return;
  }

  if (changed) fs.writeFileSync("data/transcript.html", response!.data, "utf8");
}

// run at the beginning
await saveTranscript();
cron.schedule("*/30 6-23 * * *", async () => {
  console.log(`[${new Date().toLocaleString()}] Running CRON job.`);
  await saveTranscript();
});

createHttpServer();
