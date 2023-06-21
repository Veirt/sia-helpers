import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import fs from "fs";
import puppeteer from "puppeteer";
import { createHttpServer } from "./server.js";

dotenv.config();

const LOGIN_PAGE_URL = "https://sia.unmul.ac.id/login";

async function getLoginCookie() {
    if (process.env.NIM === undefined || process.env.PASSWORD === undefined) {
        console.error("Please set environment variable NIM and PASSWORD first.");
        process.exit();
    }

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    page.goto(LOGIN_PAGE_URL);

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
    await browser.close();

    const ci_session_cookie = cookies.filter(
        (cookie) => cookie.name === "ci_session"
    )[0];

    fs.writeFileSync(
        "cookie.txt",
        `ci_session=${ci_session_cookie.value}`,
        "utf8"
    );
}

const cookieExist = fs.existsSync("cookie.txt");
if (!cookieExist) {
    await getLoginCookie();
}

const cookie = fs.readFileSync("cookie.txt", "utf8").trim();

async function getTranscript() {
    const response = await axios.get(
        "https://sia.unmul.ac.id/mhstranskrip/loaddatas",
        {
            headers: { cookie },
        }
    );

    return response;
}

let response = await getTranscript();

if (response.headers.refresh === "0;url=https://sia.unmul.ac.id/login") {
    console.log("Getting cookies and retrying request...");
    await getLoginCookie();

    response = await getTranscript();
}

const transcriptHtmlExist = fs.existsSync("data/transcript.html");
if (transcriptHtmlExist) {
    const oldTranscript = fs.readFileSync("data/transcript.html", "utf8");
    const newTranscript = response.data;

    if (oldTranscript !== newTranscript) {
        fs.writeFileSync("data/transcript.html", response.data, "utf8");
    }
} else {
    fs.writeFileSync("data/transcript.html", response.data, "utf8");
}

const transcriptHtml = fs.readFileSync("data/transcript.html");
const $ = cheerio.load(transcriptHtml);
$(".row").remove();
fs.writeFileSync("data/transcript-render.html", $.html(), "utf8");

createHttpServer();
