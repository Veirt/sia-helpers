// ==UserScript==
// @name        SIA Unmul Userscript
// @namespace   Violentmonkey Scripts
// @match       *://ais.unmul.ac.id/*
// @match       *://star.unmul.ac.id/*
// @grant       none
// @version     1.1.1
// @author      Miez & Veirt
// @updateURL   https://veirt.github.io/sia-helpers/sia.user.js
// @downloadURL https://veirt.github.io/sia-helpers/sia.user.js
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
function fillQuestionnaire(nilai) {
    document.querySelectorAll('.form-check-input').forEach(button => {
        if (button.value === nilai) button.checked = true;
    });
}

function fillQuestionnaireRandom(rentang) {
    const skalaPenilaian = document.querySelectorAll('.form-check-input');
    const groups = {};

    skalaPenilaian.forEach(button => {
        if (!groups[button.name]) groups[button.name] = [];
        groups[button.name].push(button);
    });

    Object.values(groups).forEach(buttons => {
        const filtered = buttons.filter(button => rentang.includes(parseInt(button.value)));
        const randomButton = filtered[Math.floor(Math.random() * filtered.length)];
        randomButton.checked = true;
    });
}

function resetQuestionnaire() {
    document.querySelectorAll('.form-check-input').forEach(button => {
       button.checked = false;
    });
}

let isAutoFilling = false; // Flag toggle for autofilling.

function autoFillQuestionnaire() {
    if (isAutoFilling) {
        isAutoFilling = false;
        console.log("Autofill dimatikan.");
        return;
    }

    isAutoFilling = true;
    console.log("Autofill dinyalakan.");
    let matkulIndex = parseInt(sessionStorage.getItem('currentMatkulIndex')) || 0;
    let dosenIndex = parseInt(sessionStorage.getItem('currentDosenIndex')) || 0;

    function isiDosenBerikutnya() {
        if (!isAutoFilling) return;

        const mataKuliahRows = document.querySelectorAll('tr');
        if (matkulIndex >= mataKuliahRows.length) {
            sessionStorage.clear();
            isAutoFilling = false;
            console.log("Semua kuesioner selesai.");
            return;
        }

        const currentMatkulRow = mataKuliahRows[matkulIndex];
        const dosenBadges = currentMatkulRow.querySelectorAll('.badge-primary');
        const kuisionerButton = currentMatkulRow.querySelector('.kuisioner');

        if (!dosenBadges || dosenIndex >= dosenBadges.length) {
            matkulIndex++;
            dosenIndex = 0;
            sessionStorage.setItem('currentMatkulIndex', matkulIndex);
            sessionStorage.setItem('currentDosenIndex', dosenIndex);
            setTimeout(isiDosenBerikutnya, 1000);
            return;
        }

        if (kuisionerButton && isButtonVisible(kuisionerButton)) {
            sessionStorage.setItem('currentMatkulIndex', matkulIndex);
            sessionStorage.setItem('currentDosenIndex', dosenIndex);

            kuisionerButton.click();

            setTimeout(() => {
                isiKuesionerUntukDosen(() => {
                    if (isAutoFilling) {
                        dosenIndex++;
                        setTimeout(isiDosenBerikutnya, 1500);
                    }
                });
            }, 2500);
        } else {
            dosenIndex++;
            setTimeout(isiDosenBerikutnya, 2000);
        }
    }

    function isiKuesionerUntukDosen(callback) {
        let step = 0;

        function klikNextStep() {
            if (!isAutoFilling) return;
            if (step < 5) {
                const nextButton = document.getElementById('nextbtn');
                if (nextButton) {
                    fillQuestionnaireRandom([4, 5]);
                    setTimeout(() => {
                        nextButton.click();
                        step++;
                        setTimeout(klikNextStep, 1500);
                    }, 1000);
                } else {
                    setTimeout(klikNextStep, 2000);
                }
            } else {
                klikSubmit(callback);
            }
        }

        function klikSubmit(callback) {
            if (!isAutoFilling) return;
            const submitButton = document.querySelector('button[type="submit"], button#nextbtn');
            if (submitButton) {
                setTimeout(() => {
                    submitButton.click();
                    setTimeout(callback, 1500);
                }, 1000);
            } else {
                setTimeout(() => klikSubmit(callback), 2000);
            }
        }

        klikNextStep();
    }

    function isButtonVisible(button) {
        const style = window.getComputedStyle(button);
        return button && button.offsetParent !== null &&
            style.display !== 'none' && style.visibility !== 'hidden';
    }

    isiDosenBerikutnya();
}
// Warning: The automatic questionnaire in this version is currently unstable. Please use the stable version at: https://github.com/miezlearning/cheat-ais

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

/*
  Normally, isMobileDevice() will check the user agent.
  This function will mock the function to always return true. (STAR)
*/
function mockMobile() {
    window.isMobileDevice = function () {
        return true;
    };
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
                if (e.altKey) {
                    if (e.key === "1") fillQuestionnaire("1");
                    else if (e.key === "2") fillQuestionnaire("2");
                    else if (e.key === "3") fillQuestionnaire("3");
                    else if (e.key === "4") fillQuestionnaire("4");
                    else if (e.key === "5") fillQuestionnaire("5");
                    else if (e.key.toLowerCase() === "q") autoFillQuestionnaire();
                    else if (e.key.toLowerCase() === "p") resetQuestionnaire();
                }
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
            mockMobile();
            break;
    }
}