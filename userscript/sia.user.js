// ==UserScript==
// @name        SIA Unmul Userscript
// @namespace   Violentmonkey Scripts
// @match       *://ais.unmul.ac.id/*
// @match       *://star.unmul.ac.id/*
// @grant       none
// @version     1.0.4
// @author      Veirt
// @description 12/17/2022, 7:59:02 PM
// ==/UserScript==

const MY_CLASS = "Kelas B 2022";

const path = window.location.pathname;
const host = window.location.host;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

/*
   Fill questionnaire automatically with the keybind <Alt>-q (AIS)
*/
function fillQuestionnaire() {
    const radioForms = document.querySelectorAll(".col-sm-4 > .radio-form");

    for (const radioForm of radioForms) {
        // index 2 to 4 ( rating 3 to 5 )
        const random = getRandomInt(2, 5);

        const radios = radioForm.children;
        const radio = radios[random].children[0];
        radio.checked = true;
    }
}

/*
   Fill CAPTCHA automatically. (AIS)
*/
function loginCaptchaSolver() {
    let captcha = document.querySelector(".badge").innerText;
    let input = document.querySelector("input[name='login[sc]']");

    if (input) input.value = captcha;
}

/*
  When 404, back to referrer instead of home page. (AIS)
*/
function backToReferrer() {
    // benerin back button
    const backButton = document.querySelector(".btn.btn-danger-gradien.btn-lg");
    if (backButton) {
        backButton.href = document.referrer;
        backButton.innerHTML = "BACK TO LAST PAGE";
    }
}

/*
  Properly redirect when cookie is still valid. (AIS)
*/
function redirectIfLoggedIn() {
    const AIS_HOME_URL = "https://ais.unmul.ac.id/mahasiswa/home";
    fetch(AIS_HOME_URL, { redirect: "error" })
        .then((_) => (window.location = AIS_HOME_URL))
        .catch((_err) => {
            console.error("Not logged in.");
        });
}

/*
   Make the login page a little bit more responsive. (AIS)
*/
function responsiveLoginPage() {
    const divWrapper = document.querySelector(".login-card > div:nth-child(1)");
    if (divWrapper) divWrapper.style = "width: 450px";

    const div = document.querySelector(".login-card > div:nth-child(1) > div:nth-child(2)");
    if (div) div.removeAttribute("style");
}

function fixStarAbsenceOnDesktop() {
    window.isMobileDevice = function () {
        return true;
    };

    // navigator.geolocation.getCurrentPosition() is so slow in firefox
    const FIVE_MINUTES = 30000;

    // defualt coordinates for campus
    const coords = {
        latitude: -0.4671397 + (Math.random() % 0.00001),
        longitude: 117.1573591 + (Math.random() % 0.00001),
    };
    navigator.geolocation.getCurrentPosition(
        function (position) {
            coords.latitude = position.coords.latitude;
            coords.longitude = position.coords.longitude;
        },
        null,
        { enableHighAccuracy: false, maximumAge: FIVE_MINUTES },
    );

    let observerEnabled = true; // Flag to indicate if the observer logic should be executed

    const observer = new MutationObserver((_mutations) => {
        if (document.querySelector("#absenForm") && observerEnabled) {
            const latitudeInput = document.getElementById("latitude");
            const longitudeInput = document.getElementById("longitude");

            if (latitudeInput) {
                latitudeInput.type = "input";
                latitudeInput.value = coords.latitude;
            }

            if (longitudeInput) {
                longitudeInput.type = "input";
                longitudeInput.value = coords.longitude;
            }

            webcamInit("#cameraFeed");
            closeCamera();
            resetCamera();

            observerEnabled = false; // Disable observer logic after execution
        } else {
            observerEnabled = true; // Re-enable observer when #absenForm disappears
        }
    });

    // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}

(function () {
    // AIS
    if (host.startsWith("ais")) {
        if (path === "/" || path === "/index.php/login") {
            redirectIfLoggedIn();
            responsiveLoginPage();
            loginCaptchaSolver();
        }

        backToReferrer();

        // auto fill kuisioner
        if (path.startsWith("/mahasiswa/khs")) {
            document.addEventListener("keydown", (e) => {
                if (e.key.toLowerCase() === "q" && e.altKey) fillQuestionnaire();
            });
        }
    }

    // STAR
    if (host.startsWith("star")) {
        if (path === "/login") {
            loginCaptchaSolver();
        } else if (path === "/mahasiswa/kelas") {
            fixStarAbsenceOnDesktop();
        }
    }
})();
