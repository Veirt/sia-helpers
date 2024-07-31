// ==UserScript==
// @name        SIA Unmul Userscript
// @namespace   Violentmonkey Scripts
// @match       *://ais.unmul.ac.id/*
// @match       *://star.unmul.ac.id/*
// @grant       none
// @version     1.0.7
// @author      Miez & Veirt
// @description 07/31/2024, 11:16:02 AM
// ==/UserScript==

const NIM = ""; // isi pake nim sendiri
const PASSWORD = ""; // isi password sendiri
//aman kok.

const path = window.location.pathname;
const host = window.location.host;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

/*
   Automatically log in when the variable NIM and PASSWORD is being set (AIS/STAR)
*/
function loginAutomatically() {
    if (!NIM && !PASSWORD) {
        return;
    }

    const form = document.querySelector("#form-sign");
    const submitButton = document.querySelector("button[type='submit']");
    const usernameInput = document.querySelector('input[name="login[username]"]');
    const passwordInput = document.querySelector('input[name="login[password]"]');

    if (usernameInput && passwordInput) {
        usernameInput.value = NIM;
        passwordInput.value = PASSWORD;
    }

    // disable the built-in submit handler
    $("#form-sign").off();

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = new FormData(form);
        fetch(form.action, {
            method: "POST",
            body: formData,
        })
            .then((res) => res.json())
            .then((data) => {
                if (!data.status) {
                    swal("Gagal Login!.", data.message, "error");
                    return;
                }

                window.location.href = data.redirect;
            });
    });

    submitButton.click();
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
   Fill CAPTCHA automatically. (AIS/STAR)
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
    return new Promise((resolve, reject) => {
        fetch(AIS_HOME_URL, { redirect: "error" })
            .then((_) => {
                window.location = AIS_HOME_URL;
                return resolve();
            })
            .catch((_err) => {
                return reject("Not logged in.");
            });
    });
}

function fixStarAbsenceOnDesktop() {
    window.isMobileDevice = function () {
        return true;
    };

    // navigator.geolocation.getCurrentPosition() is so slow in firefox
    // defualt coordinates for campus
    const coords = {
        latitude: -0.4671397 + (Math.random() % 0.00001),
        longitude: 117.1573591 + (Math.random() % 0.00001),
    };

    let observerEnabled = true; // Flag to indicate if the observer logic should be executed
    const observer = new MutationObserver((_mutations) => {
        if (document.querySelector("#absenForm") && observerEnabled) {
            const latitudeInput = document.getElementById("latitude");
            const longitudeInput = document.getElementById("longitude");

            if (latitudeInput) {
                latitudeInput.type = "input";
                latitudeInput.value = coords.latitude;
                latitudeInput.style = "margin: 10px 0";
            }

            if (longitudeInput) {
                longitudeInput.type = "input";
                longitudeInput.value = coords.longitude;
                longitudeInput.style = "margin: 10px 0";
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

// AIS
if (host.startsWith("ais")) {
    switch (path) {
        case "/":
        case "/index.php/login":
            redirectIfLoggedIn().catch((_) => {
                loginCaptchaSolver();
                loginAutomatically();
            });
            break;

        case "/mahasiswa/khs":
            document.addEventListener("keydown", (e) => {
                if (e.key.toLowerCase() === "q" && e.altKey) fillQuestionnaire();
            });
            break;
    }

    backToReferrer();
}

// STAR
if (host.startsWith("star")) {
    switch (path) {
        case "/login":
            loginCaptchaSolver();
            loginAutomatically();
            break;
        case "/mahasiswa/kelas":
            fixStarAbsenceOnDesktop();
            break;
    }
}
