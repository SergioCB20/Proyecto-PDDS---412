#!/usr/bin/env node
// gen-csv-curso.mjs
// Generador CLI de archivos CSV del curso para operaciones día-a-día.
// Uso: node gen-csv-curso.mjs --hora 11:00
//
// Genera 4 archivos (SPIM, SABE, EKCH, VIDP) en ./generated/ con formato:
//   id_envío-aaaammdd-hh-mm-dest-###-IdClien
//
// hh-mm está ajustado al huso horario de cada sede.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const horaIdx = args.indexOf('--hora');
const horaPresentacion = horaIdx >= 0 ? args[horaIdx + 1] : '11:00';

const [hh, mm] = horaPresentacion.split(':').map(n => parseInt(n, 10));

// Huso horario (offset en horas) de cada sede vs Lima (UTC-5)
const TZ_OFFSET_HOURS = {
  SPIM: 0,           // America/Lima, UTC-5 (referencia)
  SABE: -2,          // America/Argentina/Buenos_Aires, UTC-3
  EKCH: 6,           // Europe/Copenhagen, UTC+1 (sin DST por seguridad)
  VIDP: 10 + 0.5,    // Asia/Kolkata, UTC+5:30
};

// Patrones de vuelos del enunciado:
// 12 (dentro America sur) 6h, 13 (fuera America sur) 12h, etc.
// 6 grupos × 3 sedes × 6 destinos (SCEL, SVMI, SBBR, SKBO, SGAS, SUAA, EBCI, LBSF, OAKB, OPKC, EHAM, OMDB)
// Para simplificar, se generan 12 envíos por sede (uno por cada destino ejemplo del txt curso).
const DESTINOS = [
  'SCEL', 'SVMI', 'SBBR', 'SKBO', 'SGAS', 'SUAA',
  'EBCI', 'LBSF', 'OAKB', 'OPKC', 'EHAM', 'OMDB'
];

const DESTINOS_CONTINENTE = {
  SCEL: 'sudamerica', SVMI: 'sudamerica', SBBR: 'sudamerica',
  SKBO: 'sudamerica', SGAS: 'sudamerica', SUAA: 'sudamerica',
  EBCI: 'europa', LBSF: 'europa', EHAM: 'europa',
  OAKB: 'asia', OPKC: 'asia', OMDB: 'asia',
};

function fechaHoyStr(year, month, day) {
  return `${year}${String(month).padStart(2,'0')}${String(day).padStart(2,'0')}`;
}

function ajustarHoraPorSede(baseHora, baseMin, tzDelta) {
  let deltaMin = Math.round(tzDelta * 60);
  let h = baseHora;
  let m = baseMin + deltaMin;
  while (m >= 60) { h++; m -= 60; }
  while (m < 0) { h--; m += 60; }
  while (h >= 24) { h -= 24; }
  while (h < 0) { h += 24; }
  return [h, m];
}

function generarContenido(sede) {
  const tzDelta = TZ_OFFSET_HOURS[sede];
  const today = new Date();
  const fechaStr = fechaHoyStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const idBase = sede === 'SPIM' ? '00000001' :
                 sede === 'SABE' ? '10000001' :
                 sede === 'EKCH' ? '20000001' : '30000001';

  const lines = [];
  lines.push(`# Recepción ${sede}, hora presentación Lima: ${horaPresentacion}`);
  lines.push(`# TZ offset vs Lima: ${tzDelta}h`);
  lines.push(`# Formato: id_envío-aaaammdd-hh-mm-dest-###-IdClien`);
  lines.push('');

  DESTINOS.forEach((dest, i) => {
    const idNum = parseInt(idBase, 10) + i;
    const idStr = String(idNum).padStart(8, '0');

    // Cantidad: 180 si destino sudamerica y fuera EU/AS, 180 si destino EU/AS desde SPIM/SABE.
    // Para EKCH/VIDP, dentro EU-AS = 180, fuera (sudamerica) = 10 o 15.
    let cantidad;
    const destinoCont = DESTINOS_CONTINENTE[dest];
    const sedeCont = sede === 'SPIM' || sede === 'SABE' ? 'sudamerica' : 'europa-asia';
    if (sedeCont === destinoCont) {
      cantidad = (sede === 'SPIM' || sede === 'SABE') ? 180 :
                 (i < 6 ? 180 : 15); // EU/AS a EU/AS: 6h, OAKB/OPKC/EHAM/OMDB no aplica, manual
    } else {
      cantidad = 10;
    }

    // Ajuste de hora por delta huso
    const [hAjust, mAjust] = ajustarHoraPorSede(hh, mm, tzDelta);

    const hhStr = String(hAjust).padStart(2, '0');
    const mmStr = String(mAjust).padStart(2, '0');

    lines.push(`${idStr}-${fechaStr}-${hhStr}-${mmStr}-${dest}-${cantidad}-0007729`);
  });

  return lines.join('\n') + '\n';
}

const outDir = path.join(__dirname, 'generated');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

['SPIM', 'SABE', 'EKCH', 'VIDP'].forEach(sede => {
  const filename = path.join(outDir, `${sede}.csv`);
  const contenido = generarContenido(sede);
  fs.writeFileSync(filename, contenido, 'utf8');
  console.log(`✓ Generado ${filename}`);
});

console.log('\nPróximo paso:');
console.log(' 1. Ir a /admin/prep');
console.log(' 2. Subir planes-vuelo .txt generado (separar del gen actual)');
console.log(' 3. Por cada sede, ir a Operación / elegir sede / Setup / Cargar envíos y subir el CSV correspondiente');
