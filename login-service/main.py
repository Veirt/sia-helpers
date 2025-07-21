import os

from dotenv import load_dotenv
from fastapi import FastAPI
from seleniumbase import SB

load_dotenv()

LOGIN_PAGE_URL = "https://ais.unmul.ac.id"

NIM = os.getenv("NIM")
PASSWORD = os.getenv("PASSWORD")

app = FastAPI()


@app.get("/api/login")
def login():
    with SB(
        uc=True,
        xvfb=True,
        xvfb_metrics="1920,1080",
    ) as sb:
        sb.activate_cdp_mode(LOGIN_PAGE_URL, headless=True)
        sb.maximize_window()
        sb.sleep(4)
        sb.uc_gui_click_captcha()

        sb.type('[name="login[username]"]', NIM)
        sb.type('[name="login[password]"]', PASSWORD)

        sb.click("button.btn")
        sb.sleep(2)
        cookies = sb.get_cookies()
        if cookies[0]["name"] == "ci_session":
            print(cookies[0]["value"])
            return cookies[0]["value"]
