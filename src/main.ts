import generateMurdoku, { Direction, HintType, generateHints, type Hint } from "murdokugen";
import "./styles.css";

type CaseData = {
  width: number;
  height: number;
  zonesCount: number;
  obstaclesCount: number;
  zoneMap: number[][];
  solutionMap: number[][];
  obstacleMap: number[][];
  persons: Person[];
  hints: Hint[];
};

type Person = {
  id: number;
  name: string;
  row: number;
  col: number;
};

type Mode = "answer" | "note" | "erase";

type PlayerCell = {
  answer: number | null;
  notes: Set<number>;
};

const personNames = [
  "Vega", "Bruno", "Clara", "Diego", "Iris", "Hugo", "Nora", "Leo", "Maia", "Teo"
];

const zoneNames = [
  "Biblioteca", "Cocina", "Invernadero", "Bodega", "Salón", "Galería", "Despacho", "Terraza", "Archivo", "Vestíbulo"
];

const zoneColors = [
  "#f3d894",
  "#e9b694",
  "#cfe4c3",
  "#f1cfaa",
  "#d9c0ea",
  "#f6e6b2",
  "#c8dde8",
  "#ead39b",
  "#e7b9c4",
  "#d6d5a8"
];

const app = document.querySelector<HTMLDivElement>("#app")!;

let currentCase: CaseData;
let selectedPerson = 0;
let mode: Mode = "answer";
let player: PlayerCell[][] = [];
let revealSolution = false;
let message = "Genera un caso y usa el modo respuesta o marcas para resolverlo.";
let messageType: "" | "ok" | "bad" = "";

function createEmptyPlayer(height: number, width: number): PlayerCell[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ answer: null, notes: new Set<number>() }))
  );
}

function peopleFromSolution(solutionMap: number[][]): Person[] {
  const people: Person[] = [];
  for (let r = 0; r < solutionMap.length; r++) {
    for (let c = 0; c < solutionMap[r].length; c++) {
      if (solutionMap[r][c] === 1) {
        people.push({ id: people.length + 1, name: personNames[people.length] ?? `Persona ${people.length + 1}`, row: r, col: c });
      }
    }
  }
  return people;
}

function getNumberInput(id: string): number {
  const input = document.querySelector<HTMLInputElement>(`#${id}`)!;
  return Number(input.value);
}

function generateCaseFromControls() {
  const width = getNumberInput("width");
  const height = getNumberInput("height");
  const zonesCount = getNumberInput("zonesCount");
  const obstaclesCount = getNumberInput("obstaclesCount");
  try {
    const { zoneMap, solutionMap, obstacleMap } = generateMurdoku(width, height, zonesCount, obstaclesCount);
    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      hintCount: getNumberInput("hintCount"),
      allowedTypes: [HintType.SameZone, HintType.ZoneCount, HintType.AdjacentObstacle, HintType.CardinalRelation],
      difficulty: "mixed",
      includeBuiltIns: true,
      deduplicate: true,
      strictMode: false
    });
    currentCase = { width, height, zonesCount, obstaclesCount, zoneMap, solutionMap, obstacleMap, persons: peopleFromSolution(solutionMap), hints };
    player = createEmptyPlayer(height, width);
    selectedPerson = 0;
    revealSolution = false;
    message = "Caso generado. Coloca cada sospechoso una vez, respetando pistas, filas y columnas.";
    messageType = "ok";
    render();
  } catch (error) {
    message = error instanceof Error ? error.message : "No se pudo generar el caso con esos parámetros.";
    messageType = "bad";
    render();
  }
}

function initCase() {
  const width = 6;
  const height = 6;
  const zonesCount = 4;
  const obstaclesCount = 7;
  const { zoneMap, solutionMap, obstacleMap } = generateMurdoku(width, height, zonesCount, obstaclesCount);
  const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
    hintCount: 8,
    allowedTypes: [HintType.SameZone, HintType.ZoneCount, HintType.AdjacentObstacle, HintType.CardinalRelation],
    difficulty: "mixed",
    includeBuiltIns: true,
    deduplicate: true,
    strictMode: false
  });
  currentCase = { width, height, zonesCount, obstaclesCount, zoneMap, solutionMap, obstacleMap, persons: peopleFromSolution(solutionMap), hints };
  player = createEmptyPlayer(height, width);
}

function directionLabel(direction: Direction | string): string {
  if (direction === Direction.North || direction === "north") return "norte";
  if (direction === Direction.South || direction === "south") return "sur";
  if (direction === Direction.East || direction === "east") return "este";
  return "oeste";
}

function personLabel(id: number): string {
  return currentCase.persons.find(p => p.id === id)?.name ?? `Persona ${id}`;
}

function zoneLabel(id: number): string {
  return zoneNames[id] ?? `Zona ${id + 1}`;
}

function hintText(hint: Hint): string {
  switch (hint.type) {
    case HintType.SameZone:
      return `${personLabel(hint.payload.personIds[0])} y ${personLabel(hint.payload.personIds[1])} estuvieron en la misma zona: ${zoneLabel(hint.payload.zoneId)}.`;
    case HintType.ZoneCount:
      return `En ${zoneLabel(hint.payload.zoneId)} hay exactamente ${hint.payload.personCount} sospechoso(s).`;
    case HintType.AdjacentObstacle:
      return `${personLabel(hint.payload.personId)} tenía obstáculo(s) al ${hint.payload.directions.map(directionLabel).join(", ")}.`;
    case HintType.CardinalRelation:
      return `${personLabel(hint.payload.personId)} está a ${hint.payload.distance} casilla(s) al ${directionLabel(hint.payload.direction)} de ${personLabel(hint.payload.referencePersonId)}.`;
    default:
      return "Pista no reconocida.";
  }
}

function isVisibleObstacle(r: number, c: number): boolean {
  return currentCase.obstacleMap[r][c] === 1 && currentCase.solutionMap[r][c] === 0;
}

function personAt(r: number, c: number): Person | undefined {
  return currentCase.persons.find(p => p.row === r && p.col === c);
}

function clickCell(r: number, c: number) {
  if (isVisibleObstacle(r, c)) return;
  const cell = player[r][c];
  const personId = currentCase.persons[selectedPerson]?.id;
  if (!personId) return;
  if (mode === "answer") {
    cell.answer = cell.answer === personId ? null : personId;
  } else if (mode === "note") {
    if (cell.notes.has(personId)) cell.notes.delete(personId);
    else cell.notes.add(personId);
  } else {
    cell.answer = null;
    cell.notes.clear();
  }
  message = "Movimiento actualizado.";
  messageType = "";
  render();
}

function checkPlayer() {
  let wrong = 0;
  let filled = 0;
  const expected = new Map<string, number>();
  currentCase.persons.forEach(p => expected.set(`${p.row}-${p.col}`, p.id));

  for (let r = 0; r < currentCase.height; r++) {
    for (let c = 0; c < currentCase.width; c++) {
      const answer = player[r][c].answer;
      if (answer !== null) {
        filled++;
        if (expected.get(`${r}-${c}`) !== answer) wrong++;
      }
    }
  }

  const target = currentCase.persons.length;
  if (filled < target) {
    message = `Tienes ${filled}/${target} sospechoso(s) colocados. Incorrectos visibles: ${wrong}.`;
    messageType = wrong ? "bad" : "";
  } else if (wrong === 0 && filled === target) {
    message = "Caso cerrado: todas las posiciones son correctas.";
    messageType = "ok";
  } else {
    message = `Hay ${wrong} posición(es) incorrecta(s).`;
    messageType = "bad";
  }
  render();
}

function clearBoard() {
  player = createEmptyPlayer(currentCase.height, currentCase.width);
  revealSolution = false;
  message = "Tablero limpio.";
  messageType = "";
  render();
}

function renderCell(r: number, c: number): string {
  const zone = currentCase.zoneMap[r][c];
  const cell = player[r][c];
  const expected = personAt(r, c);
  const classes = ["cell"];
  if (isVisibleObstacle(r, c)) classes.push("blocked");
  if (cell.answer !== null && expected) classes.push(cell.answer === expected.id ? "correct" : "wrong");
  if (cell.answer !== null && !expected) classes.push("wrong");
  const zoneColor = zoneColors[zone % zoneColors.length];

  if (isVisibleObstacle(r, c)) {
    return `<button class="${classes.join(" ")}" style="background:#0d1017" disabled><span>⬛</span><span class="cell-meta">bloqueada</span></button>`;
  }

  const answer = cell.answer !== null ? `<span class="token">${cell.answer}</span><span>${personLabel(cell.answer)}</span>` : `<span class="cell-meta">Toca para ${mode === "answer" ? "colocar" : mode === "note" ? "marcar" : "borrar"}</span>`;
  const solution = revealSolution && expected ? `<span class="cell-meta">Solución: ${expected.name}</span>` : "";
  const notes = [...cell.notes].map(n => `<span class="note">${personLabel(n)}</span>`).join("");
  return `<button class="${classes.join(" ")}" style="--zone-bg:${zoneColor}" data-r="${r}" data-c="${c}">
    <span class="zone-label">${zoneLabel(zone)}</span>
    <span>${answer}</span>
    <span class="notes">${notes}</span>
    ${solution}
  </button>`;
}

function renderBoard(): string {
  const cells: string[] = [];
  for (let r = 0; r < currentCase.height; r++) {
    for (let c = 0; c < currentCase.width; c++) {
      cells.push(renderCell(r, c));
    }
  }
  return `<div class="board" style="grid-template-columns: repeat(${currentCase.width}, minmax(92px, 1fr));">${cells.join("")}</div>`;
}

function solutionText(): string {
  const grid = Array.from({ length: currentCase.height }, () => Array.from({ length: currentCase.width }, () => " · "));
  currentCase.persons.forEach(p => { grid[p.row][p.col] = String(p.id).padStart(2, " "); });
  for (let r = 0; r < currentCase.height; r++) {
    for (let c = 0; c < currentCase.width; c++) {
      if (isVisibleObstacle(r, c)) grid[r][c] = "██";
    }
  }
  return grid.map(row => row.join(" ")).join("\n");
}

function render() {
  app.innerHTML = `
    <div class="app">
      <header class="header">
        <div class="book-cover">
          <div class="cover-title">MURDOKU</div>
          <div class="cover-subtitle">Generador de lógica y asesinatos</div>
        </div>
        <p class="intro">Crea tableros nuevos, coloca sospechosos, añade marcas y comprueba la solución. Los números de cada sospechoso corresponden a sus pistas.</p>
      </header>

      <section class="panel controls">
        <div class="field"><label for="width">Ancho</label><input id="width" type="number" min="4" max="10" value="${currentCase.width}"></div>
        <div class="field"><label for="height">Alto</label><input id="height" type="number" min="4" max="10" value="${currentCase.height}"></div>
        <div class="field"><label for="zonesCount">Zonas</label><input id="zonesCount" type="number" min="2" max="10" value="${currentCase.zonesCount}"></div>
        <div class="field"><label for="obstaclesCount">Obstáculos</label><input id="obstaclesCount" type="number" min="0" max="40" value="${currentCase.obstaclesCount}"></div>
        <div class="field"><label for="hintCount">Pistas</label><input id="hintCount" type="number" min="4" max="18" value="${currentCase.hints.length || 8}"></div>
        <div class="actions">
          <button id="generate" class="btn primary" type="button">Generar caso</button>
          <button id="check" class="btn" type="button">Comprobar</button>
          <button id="clear" class="btn danger" type="button">Limpiar</button>
          <button id="toggleSolution" class="btn ghost" type="button">${revealSolution ? "Ocultar solución" : "Ver solución"}</button>
        </div>
      </section>

      <main class="main">
        <section class="panel board-panel">
          <div class="board-top">
            <div><strong>⬇️ Tablero</strong><br><small>Toca una celda para aplicar el modo seleccionado.</small></div>
            <span class="status-pill">${currentCase.persons.length} sospechosos · una vez por fila/columna</span>
          </div>
          <div class="board-wrap">${renderBoard()}</div>
          <div class="palette">
            <div class="mode-row">
              <button class="btn ${mode === "answer" ? "active" : ""}" data-mode="answer" type="button">Modo respuesta</button>
              <button class="btn ${mode === "note" ? "active" : ""}" data-mode="note" type="button">Modo marcas</button>
              <button class="btn ${mode === "erase" ? "active" : ""}" data-mode="erase" type="button">Borrar celda</button>
            </div>
            <div class="palette-grid">
              ${currentCase.persons.map((p, i) => `<button class="person-btn ${selectedPerson === i ? "active" : ""}" data-person="${i}" type="button"><strong>${p.id}. ${p.name}</strong><br><small>Sospechoso ${p.id}</small></button>`).join("")}
            </div>
            <div class="message ${messageType}">${message}</div>
          </div>
        </section>

        <aside class="side">
          <section class="panel card">
            <h2>Pistas generadas</h2>
            <ol class="hints">
              ${currentCase.hints.map((hint, index) => `<li class="hint"><span class="num">${index + 1}</span><span>${hintText(hint)}</span></li>`).join("") || `<li class="hint"><span class="num">!</span><span>No se han generado pistas. Prueba con otros parámetros.</span></li>`}
            </ol>
          </section>
          <section class="panel card">
            <h2>Leyenda</h2>
            <div class="legend">
              <span>⬛ obstáculo visible</span>
              <span>número = sospechoso</span>
              <span>zona = sala/color</span>
              <span>marcas = candidatos</span>
            </div>
            <p><small>Nota: los nombres son decorativos. La lógica real viene de la posición de cada persona, zonas y obstáculos generados por la librería.</small></p>
            ${revealSolution ? `<div class="solution-grid">${solutionText()}</div>` : ""}
          </section>
        </aside>
      </main>
    </div>`;

  document.querySelector<HTMLButtonElement>("#generate")?.addEventListener("click", generateCaseFromControls);
  document.querySelector<HTMLButtonElement>("#check")?.addEventListener("click", checkPlayer);
  document.querySelector<HTMLButtonElement>("#clear")?.addEventListener("click", clearBoard);
  document.querySelector<HTMLButtonElement>("#toggleSolution")?.addEventListener("click", () => { revealSolution = !revealSolution; render(); });
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(btn => btn.addEventListener("click", () => { mode = btn.dataset.mode as Mode; render(); }));
  document.querySelectorAll<HTMLButtonElement>("[data-person]").forEach(btn => btn.addEventListener("click", () => { selectedPerson = Number(btn.dataset.person); render(); }));
  document.querySelectorAll<HTMLButtonElement>("[data-r]").forEach(btn => btn.addEventListener("click", () => clickCell(Number(btn.dataset.r), Number(btn.dataset.c))));
}

initCase();
render();
