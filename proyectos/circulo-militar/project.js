'use strict';

const project = Object.freeze({
  screens: [
    { label: 'Central', count: 1, width: 12, height: 5 },
    { label: 'Laterales exteriores', count: 2, width: 6, height: 4.5 },
    { label: 'Laterales interiores', count: 4, width: 5, height: 2 },
    { label: 'Frontales laterales', count: 2, width: 7, height: 2 },
    { label: 'Frontal central', count: 1, width: 12, height: 1 }
  ],
  fixtures: [
    ['Clay Paky Stormy CC', 20],
    ['Clay Paky A.leda B-EYE K20', 10],
    ['Robe Lighting MegaPointe', 30],
    ['Robe BMFL WashBeam', 6]
  ],
  tubeBands: [1.8, 10.45],
  tubesPerTowerBand: 21,
  frontTubeCount: 51,
  plans: {
    planta: ['Planta', 'Planta acotada del escenario', 'Planta revisada · estructura y equipos del montaje sin bloque superior.'],
    elevacion: ['Elevación', 'Elevación frontal acotada del escenario', 'Elevación revisada · retiro del módulo superior de las torres y del techo central.'],
    isometrico: ['Isométrico', 'Vista isométrica del escenario', 'Isométrico revisado · pantallas y tubos del montaje sin bloque superior.']
  }
});

const formatNumber = new Intl.NumberFormat('es-PE', {maximumFractionDigits: 2});

function populateTable(id, rows) {
  const table = document.getElementById(id);
  for (const [label, ...values] of rows) {
    const row = table.insertRow();
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = label;
    row.append(heading);
    for (const value of values) row.insertCell().textContent = value;
  }
}

populateTable('screen-table', project.screens.map(({label, count, width, height}) => [
  label,
  `${count} × (${formatNumber.format(width)} × ${formatNumber.format(height)} m)`,
  `${formatNumber.format(count * width * height)} m²`
]));
populateTable('light-table', project.fixtures);

const planTabs = Array.from(document.querySelectorAll('[data-plan]'));
const planImage = document.getElementById('plan-image');
const planDialog = document.getElementById('plan-dialog');
const zoomOut = document.getElementById('plan-zoom-out');
const zoomIn = document.getElementById('plan-zoom-in');
let activePlan = 'elevacion';
let planZoom = 100;

function selectPlan(tab, focus = false) {
  activePlan = tab.dataset.plan;
  const [, alt, caption] = project.plans[activePlan];
  planImage.src = `assets/plano-${activePlan}.webp?v=4`;
  planImage.alt = alt;
  document.getElementById('plan-caption').textContent = caption;
  document.getElementById('plan-view').setAttribute('aria-labelledby', tab.id);
  for (const item of planTabs) {
    item.setAttribute('aria-selected', item === tab);
    item.tabIndex = item === tab ? 0 : -1;
  }
  if (focus) tab.focus();
}

for (const [index, tab] of planTabs.entries()) {
  tab.addEventListener('click', () => selectPlan(tab));
  tab.addEventListener('keydown', event => {
    const offset = {ArrowLeft: -1, ArrowRight: 1, Home: -index, End: planTabs.length - index - 1}[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    selectPlan(planTabs[(index + offset + planTabs.length) % planTabs.length], true);
  });
}

function zoomPlan(value) {
  planZoom = Math.max(100, Math.min(350, value));
  const image = document.getElementById('large-plan');
  image.style.setProperty('--plan-width', `${planZoom}%`);
  zoomOut.disabled = planZoom === 100;
  zoomIn.disabled = planZoom === 350;
}

zoomOut.addEventListener('click', () => zoomPlan(planZoom - 50));
zoomIn.addEventListener('click', () => zoomPlan(planZoom + 50));
document.getElementById('expand-plan').addEventListener('click', () => {
  const [title, alt] = project.plans[activePlan];
  const image = document.getElementById('large-plan');
  image.src = planImage.src;
  image.alt = alt;
  document.getElementById('plan-full').href = image.src;
  document.getElementById('dialog-title').textContent = title;
  zoomPlan(100);
  planDialog.showModal();
  image.parentElement.scrollTo(0, 0);
});
document.getElementById('close-plan').addEventListener('click', () => planDialog.close());
planDialog.addEventListener('click', event => {
  if (event.target === planDialog) planDialog.close();
});
