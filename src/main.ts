import axios, { AxiosError } from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import fs from "fs";
import * as cron from "node-cron";
import pRetry, { AbortError } from "p-retry";
import parseTranscript from "./parseTranscript.js";
import puppeteer from "puppeteer-core";
import { createHttpServer } from "./server.js";

dotenv.config();

const LOGIN_PAGE_URL = "https://sia.unmul.ac.id/login";

async function getLoginCookie() {
  console.log("Getting login cookie...");
  if (process.env.NIM === undefined || process.env.PASSWORD === undefined) {
    console.error("Please set environment variable NIM and PASSWORD first.");
    process.exit();
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    page.goto(LOGIN_PAGE_URL, { waitUntil: "load", timeout: 0 });

    const captchaSelector = "div.form-group:nth-child(3) > div:nth-child(1)";
    const inputSelector = {
      email: "#exampleInputEmail",
      password: "div.form-group:nth-child(2) > input:nth-child(1)",
      captcha: "div.form-group:nth-child(4) > input:nth-child(1)",
      submit: "button.btn",
    };
    await page.waitForSelector(captchaSelector);

    const captcha = await page.$eval(
      captchaSelector,
      (element) => element.innerHTML
    );
    await page.type(inputSelector.email, process.env.NIM);
    await page.type(inputSelector.password, process.env.PASSWORD);
    await page.type(inputSelector.captcha, captcha);
    await page.click(inputSelector.submit);

    const cookies = await page.cookies();

    const ci_session_cookie = cookies.filter(
      (cookie) => cookie.name === "ci_session"
    )[0];

    fs.writeFileSync(
      "data/cookie.txt",
      `ci_session=${ci_session_cookie.value}`,
      "utf8"
    );

    await browser.close();
  } catch (err) {
    console.error(err);
  }
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
  if (transcriptHtmlExist) {
    const oldTranscript = parseTranscript(
      fs.readFileSync("data/transcript.html", "utf8")
    );
    const newTranscript = parseTranscript(response!.data);

    for (const newData of newTranscript) {
      const oldData = oldTranscript.find(
        (oldData) => oldData.matakuliah === newData.matakuliah
      );

      // 'hacky' solution to check
      const same = JSON.stringify(newData) === JSON.stringify(oldData);

      if (!same) {
        // that means something has changed
        console.log(`${newData.matakuliah} has changed.`);
        fs.writeFileSync("data/transcript.html", response!.data, "utf8");
        break;
      }
    }
  } else {
    fs.writeFileSync("data/transcript.html", response!.data, "utf8");
  }

  const transcriptHtml = fs.readFileSync("data/transcript.html");
  const $ = cheerio.load(transcriptHtml);
  $(".row").remove();
  fs.writeFileSync("data/transcript-render.html", $.html(), "utf8");
}

// run at the beginning
await saveTranscript();
cron.schedule("*/30 6-23 * * *", async () => {
  console.log(`[${new Date().toLocaleString()}] Running CRON job.`);
  await saveTranscript();
});

createHttpServer();
