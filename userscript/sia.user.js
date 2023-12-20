// ==UserScript==
// @name        SIA Unmul Userscript
// @namespace   Violentmonkey Scripts
// @match       *://sia-arsip.unmul.ac.id/*
// @match       *://ais.unmul.ac.id/*
// @grant       none
// @version     1.0.1
// @author      Veirt
// @description 12/17/2022, 7:59:02 PM
// ==/UserScript==

"use strict";

const MY_CLASS = "Kelas B 2022";

const path = window.location.pathname;
const host = window.location.host;
console.log(path);

const LECTURER = {
  "196909261994121002": "Dr. H. Fahrul Agus, S.Si, MT",
  "196812242000031001": "Dr. Ir. Nataniel Dengen, S.Si, M.Si",
  "197211012001122001": "Ramadiani, S.Pd, M.Si, M.Kom, Ph.D",
  "197305281999031001": "Ir. Haviluddin, S.Kom, M.Kom, Ph.D",
  "197312292005011002": "Awang Harsa Kridalaksana, S.Kom, M.Kom",
  "197701032005011003": "Zainal Arifin, S.Kom, M.Kom",
  "197906062005011006": "Dr. Ir. Hamdani, ST, M.Cs",
  "197908092005011013": "Dedy Cahyadi, S.Kom, M.Eng",
  "198105062005012002": "Indah Fitri Astuti, S.Kom, M.Cs",
  "197801282008121001": "Addy Suyatno Hadisuwito, S.Kom, M.Kom",
  "197701192008122001": "Joan Angelina Widians, S.Kom, M.Kom",
  "198004042012121003": "Ir. Edy Budiman, S.Pd, MT",
  "198209012009122003": "Dr. Anindita Septiarini, ST, M.Cs",
  "198408062015042002": "Ummul Hairah, S.Pd, MT",
  "198506292012121002": "Arda Yunianta, S.Kom, M.Eng, Ph.D",
  "198507152008122003": "Ir. Heliza Rahmania Hatta, S.Kom, M.Kom",
  "198509212019032017": "Rosmasari, S.Kom, MT",
  "198511032014042002": "Masna Wati, S.Si, MT",
  "198811062015042002": "Ir. Novianti Puspitasari, S.Kom, M.Eng",
  "198905222018031001": "Medi Taruk, S.Kom, M.Cs",
  "199211062019031019": "Muhammad Bambang Firdaus, S.Kom, M.Kom",
  "199310222019031016": "Anton Prafanto, S.Kom, MT",
  "197607262006042001": "Andi Tejawati, M.Si",
  "0020099102": "Herman Santoso Pakpahan, S.Si, M.PFis",
  "0004049008": "Gubtha Mahendra Putra, S.Kom, M.Eng",
  "0027079102": "Reza Wardhana, S.Kom, M.Eng",
};

const semesterColor = {
  1: "LightCyan",
  2: "LightBlue",
  3: "CadetBlue",
  4: "AquaMarine",
  5: "MediumAquaMarine",
  6: "LightSeaGreen",
  7: "MediumSeaGreen",
};

function loginCaptchaSolver() {
  let captcha = document.querySelector(".badge").innerText;
  let input = document.querySelector("input[name='login[sc]']");

  if (input) input.value = captcha;
}

/*
  DEPRECATED.
*/
function siaLoginCaptchaSolver() {
  const path = window.location.pathname;
  if (host.startsWith("sia") && path === "/login") {
    let captcha = document.querySelector(
      "body > div > div > div > div > div > form > div:nth-child(3) > div",
    ).innerText;
    let input = document.querySelector("input[name='sc']");
    input.removeAttribute("id"); // might interfere with bitwarden auto-fill if not removed
    if (input) input.value = captcha;
  }
}

function siaHighlightMyClass() {
  if (!path.startsWith("/pmhskrs/tambah")) {
    return;
  }

  const elements = document.getElementsByTagName("td");
  for (const e of elements) {
    if (e.innerText.includes(MY_CLASS)) {
      e.style.backgroundColor = "LightCyan";
    }
  }
}

function siaModifyTranscriptTable(_changes, observer) {
  const rows = document.querySelectorAll("tbody > tr");
  const transcriptRows = [];
  if (!rows.length) {
    return;
  }

  // I sometimes change the dropdown when I'm in /pmhskhs.
  if (path !== "/pmhskhs") observer.disconnect();

  for (const row of rows) {
    if (row.childElementCount === 11 || row.childElementCount === 12)
      transcriptRows.push(row);
  }

  for (const transcriptRow of transcriptRows) {
    const transcript = {};

    transcript.no = transcriptRow.children[0].innerHTML;
    transcript.kelas = transcriptRow.children[1].innerHTML;
    transcript.kode = transcriptRow.children[2].innerHTML;
    transcript.matakuliah = transcriptRow.children[3].innerHTML;
    transcript.wp = transcriptRow.children[4].innerHTML;
    transcript.semester = transcriptRow.children[5].innerHTML;
    transcript.sks = transcriptRow.children[6].innerHTML;
    if (path === "/pmhskhs") {
      transcript.ke = transcriptRow.children[7].innerHTML; // handle "ke" in /pmhskhs
      transcript.nilai_angka = transcriptRow.children[8].innerHTML;
      transcript.nilai_huruf = transcriptRow.children[9].innerHTML;
      transcript.bobot = transcriptRow.children[10].innerHTML;
      transcript.keterangan = transcriptRow.children[11].innerHTML;
    } else {
      transcript.nilai_angka = transcriptRow.children[7].innerHTML;
      transcript.nilai_huruf = transcriptRow.children[8].innerHTML;
      transcript.bobot = transcriptRow.children[9].innerHTML;
      transcript.keterangan = transcriptRow.children[10].innerHTML;
    }

    // highlight semester
    if (transcript.semester in semesterColor) {
      transcriptRow.style.backgroundColor = semesterColor[transcript.semester];
    }

    // change lecturer NIP to name
    const [nip, ...date] = transcript.keterangan.split(" ");
    if (nip !== "" && LECTURER[nip] !== undefined) {
      const keteranganIdx = path === "/pmhskhs" ? 11 : 10;
      transcriptRow.children[keteranganIdx].innerHTML =
        `${LECTURER[nip]}<br/>${date}`;
    }
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

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

function siaFillQuestionnaire() {
  const questionnaireRows = document.querySelectorAll(
    ".tab-pane.active > table > tbody > tr",
  );

  for (const row of questionnaireRows) {
    const random = getRandomInt(3, 6);
    const checkbox = row.children[random + 1].children[0];
    checkbox.checked = true;
  }
}

(function () {
  "use strict";

  // SIA
  if (host.startsWith("sia")) {
    siaLoginCaptchaSolver();
    siaHighlightMyClass();

    // transkrip
    if (path.startsWith("/mhstranskrip") || path === "/pmhskhs") {
      const observer = new MutationObserver(siaModifyTranscriptTable);
      observer.observe(document.querySelector("#response"), {
        childList: true,
      });
    }

    // kuisioner
    if (path.startsWith("/pmhskhs/kuisioner")) {
      document.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "q" && e.altKey) {
          siaFillQuestionnaire();
        }
      });
    }
  }

  // AIS
  if (host.startsWith("ais")) {
    if (path === "/") {
      loginCaptchaSolver();
    }

    // benerin back button
    const backButton = document.querySelector(".btn.btn-danger-gradien.btn-lg");
    if (backButton) backButton.href = document.referrer;

    // auto fill kuisioner
    if (path.startsWith("/mahasiswa/khs")) {
      document.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "q" && e.altKey) {
          fillQuestionnaire();
        }
      });
    }
  }
})();
