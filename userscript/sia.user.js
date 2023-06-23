// ==UserScript==
// @name        SIA Unmul Userscript
// @namespace   Violentmonkey Scripts
// @match       *://sia.unmul.ac.id/*
// @grant       none
// @version     1.0
// @author      Veirt
// @description 12/17/2022, 7:59:02 PM
// ==/UserScript==

let path = window.location.pathname;
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

function loginCapthaSolver() {
    let captcha = document.querySelector(
        "body > div > div > div > div > div > form > div:nth-child(3) > div"
    ).innerText;

    let inp = document.querySelector("input[name='sc']");
    inp.value = captcha;
}

const MY_CLASS = "Kelas B 2022";

function highlightMyClass() {
    const elements = document.getElementsByTagName("td");
    for (const e of elements) {
        if (e.innerText.includes(MY_CLASS)) {
            e.style.backgroundColor = "LightCyan";
        }
    }
}

function modifyTranscriptTable(_changes, observer) {
    const rows = document.querySelectorAll("tbody > tr");
    const transcriptRows = [];
    if (!rows.length) {
        return;
    }
    observer.disconnect();

    for (const row of rows) {
        if (row.childElementCount === 11) transcriptRows.push(row);
    }

    for (const transcriptRow of transcriptRows) {
        const no = transcriptRow.children[0].innerHTML;
        const kelas = transcriptRow.children[1].innerHTML;
        const kode = transcriptRow.children[2].innerHTML;
        const matakuliah = transcriptRow.children[3].innerHTML;
        const wp = transcriptRow.children[4].innerHTML;
        const semester = transcriptRow.children[5].innerHTML;
        const sks = transcriptRow.children[6].innerHTML;
        const nilai_angka = transcriptRow.children[7].innerHTML;
        const nilai_huruf = transcriptRow.children[8].innerHTML;
        const bobot = transcriptRow.children[9].innerHTML;
        const keterangan = transcriptRow.children[10].innerHTML;

        // highlight semester
        if (semester in semesterColor) {
            transcriptRow.style.backgroundColor = semesterColor[semester];
        }

        // change lecturer NIP to name
        const [nip, ...date] = keterangan.split(" ");
        if (nip !== "" && LECTURER[nip] !== undefined) {
            transcriptRow.children[10].innerHTML = `${LECTURER[nip]}<br/>${date}`;
        }
    }
}

switch (path) {
    case "/login":
        loginCapthaSolver();
        break;
    case "/pmhskrs/tambah":
        highlightMyClass();
        break;

    case "/mhstranskrip":
        new MutationObserver(modifyTranscriptTable).observe(document, {
            childList: true,
            subtree: true,
        });
        break;
}
