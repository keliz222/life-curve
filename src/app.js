// Page logic: reads the form, builds the chart with lunar-javascript and Bazi, and draws it with ECharts.

const STORAGE_KEY = "life-kline.v1"; // kept from the first version so saved data still loads
const THEME_KEY = "life-curve.theme";
const YEARS_SHOWN = 81; // birth year through age 80
const MIN_BIRTH_YEAR = 1901;
const MAX_BIRTH_YEAR = 2099;

const IMPACT_LABELS = {
  3: "Great +3", 2: "Good +2", 1: "A bit good +1",
  "-1": "A bit bad −1", "-2": "Bad −2", "-3": "Very bad −3",
};

// Chart grid's left + right margins, in pixels.
const CHART_SIDE_MARGINS = 56;
// Years from this one on are the future and get forecasts.
const CURRENT_YEAR = new Date().getFullYear();
// Marker labels on the same side closer than this (in pixels, beyond their half-widths) collide.
const MIN_LABEL_GAP = 8;
// Chart text size in pixels, for the axes, phase summaries, event pins, and ✦/↳ forecast labels.
const CHART_TEXT_SIZE = 13;
// Rough width of one character in a marker label, in pixels.
const LABEL_CHAR_WIDTH = 7.2;

// Common events: picking one of these titles fills in its type, effect, and how long it lasts.
const PRESET_EVENTS = {
  "Started college": { category: "study", impact: 2, lasting: true },
  Graduated: { category: "study", impact: 2, lasting: true },
  "Failed an exam": { category: "study", impact: -2, lasting: false },
  "Got a job": { category: "career", impact: 2, lasting: true },
  "Got promoted": { category: "career", impact: 2, lasting: true },
  "Lost my job": { category: "career", impact: -3, lasting: false },
  "Started a business": { category: "career", impact: 2, lasting: true },
  "Got a raise": { category: "money", impact: 1, lasting: true },
  "Bought a home": { category: "money", impact: 2, lasting: true },
  "Lost money": { category: "money", impact: -2, lasting: false },
  "Fell in love": { category: "love", impact: 2, lasting: false },
  "Got married": { category: "love", impact: 3, lasting: true },
  "Broke up": { category: "love", impact: -2, lasting: false },
  "Had a child": { category: "family", impact: 3, lasting: true },
  "Lost a family member": { category: "family", impact: -3, lasting: true },
  "Got sick": { category: "health", impact: -2, lasting: false },
  "Recovered from an illness": { category: "health", impact: 2, lasting: false },
  "Moved to a new city": { category: "move", impact: 1, lasting: true },
  "Moved abroad": { category: "move", impact: 2, lasting: true },
  "Made a close friend": { category: "friends", impact: 1, lasting: false },
  "Fell out with a friend": { category: "friends", impact: -1, lasting: false },
};

// One-sentence, everyday explanations of Bazi terms, shown when someone hovers or taps the term.
const TERM_TIPS = {
  "Day master": "The character that stands for you: the top of your day pillar.",
  "luck cycle": "A ten-year season of your life. Each one brings its own elements.",
  "day pillar": "The pair of characters for the day you were born.",
  "Chart pattern": "Your chart's overall shape, set by the month you were born in.",
  Companion: "Your own element: friends, rivals, and yourself.",
  Resource: "The element that feeds you: learning, mentors, and support.",
  Output: "The element you feed: talent, expression, and creativity.",
  Wealth: "The element you hold back: money, rewards, and chances you can take.",
  Authority: "The element that holds you back: career, rules, and pressure.",
  clashes: "Two animals on opposite sides of the zodiac pull against each other.",
  "pairs up": "Two animals that get along join forces.",
  "team of three": "Three animals that work together and turn into one element.",
  punishment: "Three animals that rub each other the wrong way.",
};

// Wraps the first mention of each Bazi term in text with a small tip, never touching the inside
// of a tip already added.
function withTermTips(text) {
  let parts = [text];
  for (const [term, tip] of Object.entries(TERM_TIPS)) {
    const pattern = new RegExp(`\\b${term}\\b`);
    const index = parts.findIndex((part, i) => i % 2 === 0 && pattern.test(part));
    if (index < 0) continue;
    const part = parts[index];
    const match = pattern.exec(part);
    const before = part.slice(0, match.index);
    const after = part.slice(match.index + match[0].length);
    parts = [...parts.slice(0, index), before, termTip(match[0], tip), after, ...parts.slice(index + 1)];
  }
  return parts.join("");
}

function termTip(label, tip) {
  return `<span class="term" tabindex="0" data-tip="${tip}">${label}</span>`;
}

const ELEMENT_CLASS = { 木: "wood", 火: "fire", 土: "earth", 金: "metal", 水: "water" };

const state = {
  birth: null, // { date, time, hourKnown, place: { country, region, city } | null, gender }
  events: [], // { id, year, title, impact, category, lasting }
  birthData: null, // computeBirthData's result for the current birth
  adjustedChart: null, // the chart re-read with the lean from past events
  strengthShift: 0,
  followUps: [],
  previousPoints: null, // the curve before the last event change, drawn as a gray line
  lastChange: "",
  editingId: null, // the event being edited in the form, if any
  hourCandidates: null, // when the birth hour is unknown: birth data for each of the 12 hours
  hourEstimate: null, // Bazi.rectifyHour's result, once there are enough past events
  previousHourBranch: null, // the estimated hour before the last event change
  chart: null,
  timeline: [],
  points: [],
  phases: [],
  selectedYear: null,
};

const elements = {
  birthForm: document.getElementById("birth-form"),
  birthDate: document.getElementById("birth-date"),
  birthTime: document.getElementById("birth-time"),
  birthCountry: document.getElementById("birth-country"),
  birthRegion: document.getElementById("birth-region"),
  birthCity: document.getElementById("birth-city"),
  hourUnknown: document.getElementById("hour-unknown"),
  birthError: document.getElementById("birth-error"),
  results: document.getElementById("results"),
  pillars: document.getElementById("pillars"),
  summary: document.getElementById("summary"),
  elementBars: document.getElementById("element-bars"),
  chart: document.getElementById("chart"),
  yearDetail: document.getElementById("year-detail"),
  eventForm: document.getElementById("event-form"),
  eventYear: document.getElementById("event-year"),
  eventTitle: document.getElementById("event-title"),
  eventImpact: document.getElementById("event-impact"),
  eventCategory: document.getElementById("event-category"),
  eventLasting: document.getElementById("event-lasting"),
  eventPresets: document.getElementById("event-presets"),
  changeNote: document.getElementById("change-note"),
  elementCycle: document.getElementById("element-cycle"),
  eventSubmit: document.getElementById("event-submit"),
  eventCancel: document.getElementById("event-cancel"),
  eventError: document.getElementById("event-error"),
  eventList: document.getElementById("event-list"),
  eventEmpty: document.getElementById("event-empty"),
  calibrationNote: document.getElementById("calibration-note"),
};

let chartView = null;

// ---------- Saving between visits ----------

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.birth) return saved;
  } catch {
    // Storage blocked or corrupted: start fresh.
  }
  return null;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ birth: state.birth, events: state.events }));
  } catch {
    // Storage blocked (private window): the page still works, it just won't remember.
  }
}

// ---------- Bazi from lunar-javascript ----------

function computeBirthData(birth) {
  const [year, month, day] = birth.date.split("-").map(Number);
  const [hour, minute] = birth.hourKnown ? birth.time.split(":").map(Number) : [12, 0];
  const clock = { year, month, day, hour, minute };
  const place = birth.hourKnown ? findBirthPlace(birth.place) : null;
  const solar = place ? Bazi.trueSolarTime(clock, place.longitude, place.utcOffset) : clock;
  const eightChar = Solar.fromYmdHms(solar.year, solar.month, solar.day, solar.hour, solar.minute, 0)
    .getLunar()
    .getEightChar();

  const pillars = {
    year: eightChar.getYear(),
    month: eightChar.getMonth(),
    day: eightChar.getDay(),
    time: birth.hourKnown ? eightChar.getTime() : null,
  };

  const yun = eightChar.getYun(birth.gender === "male" ? 1 : 0);
  const timeline = [];
  for (const daYun of yun.getDaYun(10)) {
    const daYunGanZhi = daYun.getGanZhi() || null;
    for (const liuNian of daYun.getLiuNian()) {
      const liuNianYear = liuNian.getYear();
      if (liuNianYear < year || liuNianYear >= year + YEARS_SHOWN) continue;
      timeline.push({
        year: liuNianYear,
        age: liuNianYear - year,
        daYun: daYunGanZhi,
        liuNian: liuNian.getGanZhi(),
      });
    }
  }

  const start = yun.getStartSolar();
  return {
    chart: { ...Bazi.analyzeChart(pillars), gender: birth.gender },
    timeline,
    yunStart: { year: start.getYear(), age: start.getYear() - year, forward: yun.isForward() },
    solarTime: place ? { place, solar, clockTime: birth.time } : null,
  };
}

// When the birth hour is unknown, birth data for each of the 12 hours (时辰), so past events
// can pick the one that fits best. Each hour is read at the start of its period, by clock time.
function hourCandidates(birth) {
  return [...Bazi.HOUR_BRANCHES].map((branch, i) => ({
    branch,
    ...computeBirthData({ ...birth, hourKnown: true, time: `${String(2 * i).padStart(2, "0")}:00`, place: null }),
  }));
}

// ---------- Validation ----------

function validateBirth(birth) {
  if (!birth.date) return "Please choose your birth date.";
  const year = Number(birth.date.slice(0, 4));
  if (year < MIN_BIRTH_YEAR || year > MAX_BIRTH_YEAR) {
    return `Birth year must be between ${MIN_BIRTH_YEAR} and ${MAX_BIRTH_YEAR}.`;
  }
  if (birth.hourKnown && !birth.time) return "Please enter your birth time, or tick \"I don't know my birth time\".";
  if (birth.hourKnown && birth.place && !findBirthPlace(birth.place)) {
    return "Please finish choosing your birth place, or set the country to \"Not listed\".";
  }
  if (!birth.gender) return "Please choose a gender (it sets the direction of your luck cycles).";
  return null;
}

function validateEvent(year, title, category) {
  const firstYear = state.timeline[0].year;
  const lastYear = state.timeline[state.timeline.length - 1].year;
  if (!Number.isInteger(year) || year < firstYear || year > lastYear) {
    return `Year must be between ${firstYear} and ${lastYear}.`;
  }
  if (!title) return "Please write what happened.";
  if (title.length > 40) return "Please keep the description under 40 characters.";
  if (!category) return "Please choose what type of event this is.";
  return null;
}

// ---------- Rendering ----------

function elementSpan(character) {
  const element = Bazi.STEM_ELEMENT[character] || branchElement(character);
  return `<span class="glyph ${ELEMENT_CLASS[element]}" title="${Bazi.ELEMENT_NAMES[element]}">${character}</span>`;
}

function branchElement(branch) {
  const map = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };
  return map[branch];
}

function renderPillars(chart, hourEstimated) {
  const columns = [
    ["Year", chart.pillars.year],
    ["Month", chart.pillars.month],
    ["Day", chart.pillars.day],
    [hourEstimated ? "Hour (est.)" : "Hour", chart.pillars.time],
  ];
  elements.pillars.innerHTML = columns
    .map(([label, pillar]) => {
      const body = pillar
        ? `${elementSpan(pillar[0])}${elementSpan(pillar[1])}<div class="pillar-name">${Bazi.ganZhiName(pillar)}</div>`
        : `<span class="glyph unknown">?</span><span class="glyph unknown">?</span><div class="pillar-name">Unknown</div>`;
      const estimated = hourEstimated && pillar === chart.pillars.time ? " estimated" : "";
      return `<div class="pillar${estimated}"><div class="pillar-label">${label}</div>${body}</div>`;
    })
    .join("");
}

function ganZhiLabel(ganZhi) {
  return `${Bazi.ganZhiName(ganZhi)} ${ganZhi}`;
}

function elementLabel(element) {
  return `${Bazi.ELEMENT_NAMES[element]} ${element}`;
}

function twoDigits(number) {
  return String(number).padStart(2, "0");
}

function solarTimeLine(solarTime) {
  if (!solarTime) return "";
  const { place, solar, clockTime } = solarTime;
  const minutes = solar.correctionMinutes;
  return `<p>True solar time: <strong>${twoDigits(solar.hour)}:${twoDigits(solar.minute)}</strong>
    (clock ${clockTime} in ${place.name}, ${minutes >= 0 ? "+" : "−"}${Math.abs(minutes)} min)</p>`;
}

function factTile(label, value, note = "") {
  return `<div class="fact-tile"><span class="fact-label">${label}</span><span class="fact-value">${value}</span>${
    note ? `<span class="hint">${note}</span>` : ""
  }</div>`;
}

function strengthLine(chart, strengthShift) {
  const percent = Math.round(chart.supportRatio * 100);
  const lean = strengthShift
    ? `; your events lean it ${strengthShift > 0 ? "stronger" : "weaker"}, from
      ${Math.round(chart.naturalSupportRatio * 100)}% to ${percent}%`
    : "";
  return `${chart.strengthLabel} (${percent}% of the chart supports it${lean})`;
}

// For an unknown birth hour: which hour the past events point to, or how many more are needed.
function hourEstimateLine() {
  if (!state.hourCandidates) return "";
  const estimate = state.hourEstimate;
  if (!estimate) {
    const pastCount = state.events.filter((e) => e.year <= CURRENT_YEAR).length;
    const missing = Bazi.MIN_RECTIFY_EVENTS - pastCount;
    return `<p>Birth hour unknown: add ${missing} more past ${missing === 1 ? "event" : "events"} and your
      events will estimate it.</p>`;
  }
  if (!estimate.clear) {
    return `<p>Birth hour unknown: your ${estimate.eventCount} past events don't point to one hour yet.
      Adding more, especially big ones, helps.</p>`;
  }
  const [best, runnerUp] = estimate.ranking;
  return `<p>Birth hour estimated from your ${estimate.eventCount} past events:
    <strong>${Bazi.hourLabel(best.candidate.branch)} ${best.candidate.branch}时</strong>.
    <span class="muted">Next most likely: ${Bazi.hourLabel(runnerUp.candidate.branch)}. This is a guess from
    your events, not your real birth time.</span></p>`;
}

// The five elements on a ring, in the order they feed each other (生), with the lines across showing
// which holds back which (克). Each shows its role for this person and whether it helps or strains them.
function renderElementCycle(chart) {
  const size = 400;
  const center = size / 2;
  const ringRadius = 118;
  const nodeRadius = 34;
  const roleRadius = ringRadius + nodeRadius + 14;
  const order = Bazi.ELEMENTS; // 木 火 土 金 水: each feeds the next
  const position = (i, radius) => {
    const angle = (-90 + i * 72) * (Math.PI / 180);
    return [center + radius * Math.cos(angle), center + radius * Math.sin(angle)];
  };
  // A line from one node's edge to another's, so arrowheads stop at the circle.
  const edge = (from, to, cls) => {
    const [x1, y1] = position(from, ringRadius);
    const [x2, y2] = position(to, ringRadius);
    const length = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / length;
    const uy = (y2 - y1) / length;
    const gap = nodeRadius + 4;
    return `<line class="${cls}" x1="${x1 + ux * gap}" y1="${y1 + uy * gap}" x2="${x2 - ux * gap}" y2="${y2 - uy * gap}"
      marker-end="url(#${cls}-arrow)" />`;
  };

  const feeds = order.map((_, i) => edge(i, (i + 1) % 5, "feeds")).join("");
  const controls = order.map((_, i) => edge(i, (i + 2) % 5, "controls")).join("");
  const nodes = order
    .map((element, i) => {
      const [x, y] = position(i, ringRadius);
      const [rx, ry] = position(i, roleRadius);
      // Labels beside the ring grow away from it, so they never cover a circle.
      const anchor = rx < center - 10 ? "end" : rx > center + 10 ? "start" : "middle";
      // The label above the top circle is lifted so its second line clears the circle.
      const lift = ry < center - ringRadius ? 14 : 0;
      const group = Bazi.relationTo(chart.dayElement, element);
      const role = group === "same" ? "You" : Bazi.GROUP_NAMES[group];
      const feeling = Bazi.elementFeeling(chart, element);
      return `<g class="cycle-node ${feeling}">
        <circle cx="${x}" cy="${y}" r="${nodeRadius}" style="fill: var(--${ELEMENT_CLASS[element]})" />
        <text x="${x}" y="${y - 3}" class="node-name">${Bazi.ELEMENT_NAMES[element]}</text>
        <text x="${x}" y="${y + 14}" class="node-zh">${element}</text>
        <text x="${rx}" y="${ry - 2 - lift}" class="node-role" text-anchor="${anchor}">${role}</text>
        <text x="${rx}" y="${ry + 14 - lift}" class="node-feeling" text-anchor="${anchor}">${
          feeling === "helps" ? "helps you" : feeling === "strains" ? "strains you" : "neutral"
        }</text>
      </g>`;
    })
    .join("");

  elements.elementCycle.innerHTML = `
    <svg viewBox="-60 -24 ${size + 120} ${size + 34}" role="img"
      aria-label="The five elements: each feeds the next around the ring and holds back the one two steps on">
      <defs>
        <marker id="feeds-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" class="feeds-head" />
        </marker>
        <marker id="controls-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" class="controls-head" />
        </marker>
      </defs>
      ${controls}${feeds}${nodes}
    </svg>`;
}

function renderSummary(chart, yunStart, solarTime, strengthShift) {
  renderElementCycle(chart);
  const favorable = chart.favorable
    .map((e) => `<span class="chip ${ELEMENT_CLASS[e]}">${elementLabel(e)}</span>`)
    .join("");
  const climate = chart.climate
    ? factTile(
        termTip(`Born in ${chart.climate.season}`, "A chart born in a cold or hot season wants the opposite to balance it."),
        `needs ${elementLabel(chart.climate.element)}`,
      )
    : "";
  elements.summary.innerHTML = `
    <div class="fact-tiles">
      ${factTile(termTip("You are", TERM_TIPS["Day master"]), `<strong>${Bazi.stemName(chart.dayStem)} ${chart.dayStem}</strong>`, strengthLine(chart, strengthShift))}
      ${factTile(termTip("Helps you", "Years rich in these elements score higher on your curve."), favorable || "close to balanced")}
      ${factTile(termTip("Pattern", TERM_TIPS["Chart pattern"]), `<strong>${chart.pattern.en} ${chart.pattern.zh}</strong>`, `about ${chart.pattern.meaning}`)}
      ${climate}
      ${factTile(termTip("Luck cycles", TERM_TIPS["luck cycle"]), `from age <strong>${yunStart.age}</strong> (${yunStart.year})`, `running ${yunStart.forward ? "forward" : "backward"}, the shaded bands on your curve`)}
    </div>
    ${solarTimeLine(solarTime)}
    ${hourEstimateLine()}`;

  const total = Bazi.ELEMENTS.reduce((sum, e) => sum + chart.strength[e], 0);
  elements.elementBars.innerHTML = Bazi.ELEMENTS.map((e) => {
    const percent = Math.round((chart.strength[e] / total) * 100);
    return `<div class="bar-row"><span>${elementLabel(e)}</span>
      <div class="bar"><div class="bar-fill ${ELEMENT_CLASS[e]}" style="width:${percent}%"></div></div>
      <span class="bar-value">${percent}%</span></div>`;
  }).join("");
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderChart() {
  if (!chartView) {
    chartView = echarts.init(elements.chart);
    bindChartClicks();
    chartView.on("datazoom", () =>
      chartView.setOption({ series: [{ markArea: phaseMarkArea(), markPoint: { data: chartMarkPoints() } }] }),
    );
  }
  const points = state.points;
  const good = cssVar("--good");
  const hard = cssVar("--hard");
  const text = cssVar("--text-muted");
  const grid = cssVar("--grid");

  const gray = cssVar("--text-muted");
  chartView.setOption(
    {
      animation: true,
      textStyle: { fontFamily: cssVar("--font"), fontWeight: 300 },
      grid: { left: 40, right: CHART_SIDE_MARGINS - 40, top: 68, bottom: 76 },
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          const point = points[params[0].dataIndex];
          const eventLines = point.events
            .map((e) => `<br>📌 ${escapeHtml(e.title)} (${IMPACT_LABELS[e.impact]})`)
            .join("");
          return `<strong>${point.year} · age ${point.age}</strong><br>
            Score ${point.score} (${formatChange(point.change)})${eventLines}`;
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: points.map((p) => String(p.year)),
        // Work the age out from the year: after zooming, the label index no longer matches the data index.
        axisLabel: {
          color: text,
          fontSize: CHART_TEXT_SIZE,
          formatter: (value) => `${value}\nage ${Number(value) - points[0].year}`,
        },
        axisLine: { lineStyle: { color: grid } },
      },
      yAxis: {
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: grid } },
        axisLabel: { color: text, fontSize: CHART_TEXT_SIZE },
      },
      // Color the line and the area under it green above 50 and red below.
      // ECharts crashes on open-ended pieces (lt/gte) for line series, so both bounds are given.
      visualMap: {
        type: "piecewise",
        seriesIndex: 0,
        show: false,
        dimension: 1,
        pieces: [
          { min: 0, max: 50, color: hard },
          { min: 50, max: 100, color: good },
        ],
      },
      dataZoom: [
        { type: "inside" },
        { type: "slider", height: 18, bottom: 8, textStyle: { color: text, fontSize: CHART_TEXT_SIZE } },
      ],
      series: [
        {
          name: "Life",
          type: "line",
          data: points.map((p) => p.score),
          smooth: 0.4,
          symbol: "circle",
          symbolSize: 5,
          lineStyle: { width: 2.5 },
          areaStyle: { opacity: 0.15, origin: 50 },
          markLine: {
            silent: true,
            symbol: "none",
            data: [{ yAxis: 50 }],
            lineStyle: { color: text, type: "dashed", width: 1 },
            label: { show: false },
          },
          // A full redraw resets the zoom, so lay the labels out for the whole curve.
          markPoint: { data: chartMarkPoints({ start: 0, end: 100 }) },
          // A full redraw resets the zoom, so size the labels for the whole curve.
          markArea: phaseMarkArea({ start: 0, end: 100 }),
        },
        ...(state.previousPoints
          ? [
              {
                name: "Before",
                type: "line",
                data: state.previousPoints.map((p) => p.score),
                smooth: 0.4,
                symbol: "none",
                silent: true,
                z: 1,
                lineStyle: { width: 1.5, type: "dashed", color: gray, opacity: 0.8 },
              },
            ]
          : []),
      ],
    },
    true,
  );
}

// Light alternating bands, one per luck-cycle phase, with its summary phrase above.
// Each label is English with the Chinese idiom below it, cut short to fit its band.
function pixelsPerYear(zoom) {
  const visibleYears = Math.max(1, (state.points.length * (zoom.end - zoom.start)) / 100);
  return (elements.chart.clientWidth - CHART_SIDE_MARGINS) / visibleYears;
}

function phaseMarkArea(zoom = chartView.getOption().dataZoom[0]) {
  const yearWidth = pixelsPerYear(zoom);

  const data = state.phases.map((phase, i) => {
    const bandWidth = (phase.endYear - phase.startYear + 1) * yearWidth;
    return [
      {
        name: `${phase.phrase.en}\n${phase.phrase.zh}`,
        xAxis: String(phase.startYear),
        itemStyle: { color: i % 2 === 0 ? cssVar("--band") : "transparent" },
        label: { width: Math.max(0, bandWidth - 4) },
      },
      { xAxis: String(phase.endYear) },
    ];
  });

  return {
    silent: true,
    data,
    label: {
      position: "insideTop",
      distance: -50,
      color: cssVar("--text-muted"),
      fontSize: CHART_TEXT_SIZE,
      lineHeight: 17,
      overflow: "truncate",
    },
  };
}

function inPhase(phase, year) {
  return year >= phase.startYear && year <= phase.endYear;
}

function groupByYear(items) {
  const groups = new Map();
  for (const item of items) groups.set(item.year, [...(groups.get(item.year) || []), item]);
  return groups;
}

function shortTitle(title) {
  return title.length > 12 ? title.slice(0, 12) + "…" : title;
}

function withMore(text, count) {
  return count > 1 ? `${text} +${count - 1} more` : text;
}

// One pin per year with the user's events, colored by their combined effect.
function eventPin(year, events) {
  const point = state.points.find((p) => p.year === year);
  const total = events.reduce((sum, e) => sum + e.impact, 0);
  const isGood = total > 0 || (total === 0 && events[0].impact > 0);
  return {
    year,
    side: isGood ? "top" : "bottom",
    text: withMore(shortTitle(events[0].title), events.length),
    item: {
      name: events.map((e) => e.title).join(", "),
      coord: [String(year), point.score],
      symbol: "pin",
      symbolSize: 28,
      symbolRotate: isGood ? 0 : 180,
      symbolOffset: [0, isGood ? "-50%" : "50%"],
      itemStyle: { color: cssVar(isGood ? "--good" : "--hard") },
      label: { position: isGood ? "top" : "bottom", fontSize: CHART_TEXT_SIZE, color: cssVar("--text") },
    },
  };
}

function forecastDiamond(point, text) {
  const side = point.change >= 0 ? "top" : "bottom";
  return {
    year: point.year,
    side,
    text,
    item: {
      name: "forecast",
      coord: [String(point.year), point.score],
      symbol: "diamond",
      symbolSize: 11,
      itemStyle: { color: cssVar("--accent"), borderColor: cssVar("--card"), borderWidth: 1 },
      label: { position: side, fontSize: CHART_TEXT_SIZE, color: cssVar("--text-muted") },
    },
  };
}

// Markers on the curve, most important first: the user's events (one pin per year), forecasts
// that follow from them (↳), then each phase's key year (✦). A year gets only one marker. A
// label that would run into a more important one on the same side is hidden until hover or zoom.
function chartMarkPoints(zoom = chartView.getOption().dataZoom[0]) {
  const marks = [];
  const eventsByYear = groupByYear(state.events);
  for (const [year, events] of eventsByYear) marks.push(eventPin(year, events));

  const followUpsByYear = groupByYear(state.followUps.filter((f) => !eventsByYear.has(f.year)));
  for (const [year, followUps] of followUpsByYear) {
    const point = state.points.find((p) => p.year === year);
    marks.push(forecastDiamond(point, withMore(`↳ ${followUps[0].short}`, followUps.length)));
  }

  const phaseHasFollowUp = (point) =>
    state.followUps.some((f) => state.phases.some((ph) => inPhase(ph, f.year) && inPhase(ph, point.year)));
  for (const point of Bazi.keyFutureYears(state.points, state.phases, CURRENT_YEAR)) {
    if (phaseHasFollowUp(point) || followUpsByYear.has(point.year)) continue;
    marks.push(forecastDiamond(point, `✦ ${Bazi.predictYear(point).short}`));
  }

  const yearWidth = pixelsPerYear(zoom);
  const shown = [];
  for (const mark of marks) {
    const width = mark.text.length * LABEL_CHAR_WIDTH;
    const collides = shown.some(
      (other) =>
        other.side === mark.side &&
        Math.abs(other.year - mark.year) * yearWidth < (other.width + width) / 2 + MIN_LABEL_GAP,
    );
    mark.item.label.show = !collides;
    mark.item.label.formatter = mark.text;
    mark.item.emphasis = { label: { show: true } };
    if (!collides) shown.push({ ...mark, width });
  }
  return marks.map((mark) => mark.item);
}

function formatChange(change) {
  if (change > 0) return `▲ ${change}`;
  if (change < 0) return `▼ ${Math.abs(change)}`;
  return "no change";
}

// Clicking anywhere in a year's column selects that year.
function bindChartClicks() {
  chartView.getZr().on("click", (params) => {
    const pixel = [params.offsetX, params.offsetY];
    if (!chartView.containPixel("grid", pixel)) return;
    const index = chartView.convertFromPixel({ seriesIndex: 0 }, pixel)[0];
    const point = state.points[index];
    if (!point) return;
    state.selectedYear = point.year;
    renderYearDetail();
  });
}

function renderYearDetail() {
  const point = state.points.find((p) => p.year === state.selectedYear);
  if (!point) {
    elements.yearDetail.innerHTML = `<p class="muted">Tap any year on the curve to read about it.</p>`;
    return;
  }
  const eventItems = point.events
    .map((e) => `<li>📌 ${escapeHtml(e.title)} (${eventDescription(e)})</li>`)
    .join("");
  elements.yearDetail.innerHTML = `
    <h3>${point.year} · age ${point.age}</h3>
    <p class="muted">Score ${point.score} (${formatChange(point.change)}) ·
      year pillar ${ganZhiLabel(point.liuNian)} · luck cycle ${point.daYun ? ganZhiLabel(point.daYun) : "not started yet"}</p>
    ${phaseLine(point)}
    ${forecastLine(point)}
    ${yearExplanation(point)}
    ${eventItems ? `<ul class="detail-events">${eventItems}</ul>` : ""}
    <button type="button" class="link-button" id="add-event-here">Add an event in this year</button>`;
  document.getElementById("add-event-here").addEventListener("click", () => {
    elements.eventYear.value = point.year;
    elements.eventTitle.focus();
  });
}

// Why this year scores what it does, one plain-English line per cause with its points.
function yearExplanation(point) {
  const { lines, summary } = Bazi.explainYear(state.adjustedChart, point);
  const items = lines
    .map(
      (line) => `<li><span class="explain-text">${withTermTips(line.text)}</span>
        <span class="explain-points ${line.points > 0 ? "up" : line.points < 0 ? "down" : ""}">${
          line.points ? signed(line.points) : "±0"
        }</span></li>`,
    )
    .join("");
  return `<div class="year-explain">
    <p class="explain-title">Why ${point.year} looks like this</p>
    <ul>${items}</ul>
    <p>${summary}</p>
  </div>`;
}

function forecastLine(point) {
  if (point.year < CURRENT_YEAR) return "";
  const followUps = state.followUps
    .filter((f) => f.year === point.year)
    .map(
      (f) => `<p class="forecast"><span class="forecast-label">↳ ${f.short}.</span> ${f.text}
        <span class="muted">Follows from "${escapeHtml(f.event.title)}" (${f.event.year}).</span></p>`,
    )
    .join("");
  const forecast = Bazi.predictYear(point);
  return `${followUps}<p class="forecast"><span class="forecast-label">✦ Forecast: ${forecast.short}.</span> ${forecast.text}</p>`;
}

function phaseLine(point) {
  const phase = state.phases.find((p) => point.year >= p.startYear && point.year <= p.endYear);
  if (!phase) return "";
  return `<p class="phase-line"><strong>${phase.phrase.en} ${phase.phrase.zh}</strong>
    <span class="muted">· ages ${phase.startAge}–${phase.endAge} (${phase.startYear}–${phase.endYear}),
    average score ${phase.averageScore}</span></p>`;
}

function eventDescription(event) {
  const category = Bazi.EVENT_CATEGORIES[event.category] || Bazi.EVENT_CATEGORIES.other;
  return `${category.en} · ${event.lasting ? "Lasting" : "One-time"} · ${IMPACT_LABELS[event.impact]}`;
}

function signed(value) {
  return `${value > 0 ? "+" : "−"}${Math.abs(value)}`;
}

// Under the chart: what the last added or deleted event changed, next to the gray line.
function estimatedHourBranch() {
  return state.hourEstimate && state.hourEstimate.clear ? state.hourEstimate.ranking[0].candidate.branch : null;
}

function renderChangeNote() {
  if (!state.previousPoints) {
    elements.changeNote.hidden = true;
    return;
  }
  const change = Bazi.describeCurveChange(state.previousPoints, state.points, CURRENT_YEAR);
  const themes = Object.entries(change.futureByTheme)
    .filter(([, diff]) => Math.abs(diff) >= 0.5)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([theme, diff]) => `${Bazi.GROUP_NAMES[theme]} years ${signed(diff)}`);
  const parts = [];
  if (themes.length) parts.push(`from ${CURRENT_YEAR} on: ${themes.join(", ")}`);
  if (Math.abs(change.pastAverage) >= 0.1) parts.push(`earlier years ${signed(change.pastAverage)} on average`);
  const hourBranch = estimatedHourBranch();
  if (hourBranch && hourBranch !== state.previousHourBranch) {
    parts.push(`your estimated birth hour is now the ${Bazi.hourLabel(hourBranch)}`);
  }
  elements.changeNote.hidden = false;
  elements.changeNote.innerHTML = `<span class="ghost-key"></span> Gray dashed line: your curve before
    ${escapeHtml(state.lastChange)}. ${parts.length ? `It changed ${parts.join("; ")}.` : "Nothing changed much."}`;
}

function renderEvents() {
  const sorted = [...state.events].sort((a, b) => a.year - b.year);
  elements.eventEmpty.hidden = sorted.length > 0;
  elements.eventList.innerHTML = sorted
    .map(
      (event) => `<li class="event ${event.impact > 0 ? "good" : "bad"}${event.id === state.editingId ? " editing" : ""}">
        <span class="event-year">${event.year}</span>
        <span class="event-title">${escapeHtml(event.title)}</span>
        <span class="event-impact">${eventDescription(event)}</span>
        <span class="event-buttons">
          <button type="button" class="edit" data-id="${event.id}" aria-label="Edit event: ${escapeHtml(event.title)}">Edit</button>
          <button type="button" class="delete" data-id="${event.id}" aria-label="Delete event: ${escapeHtml(event.title)}">Delete</button>
        </span>
      </li>`,
    )
    .join("");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderCalibration(calibration) {
  const count = calibration.pastEventCount;
  if (count < Bazi.MIN_CALIBRATION_EVENTS) {
    const missing = Bazi.MIN_CALIBRATION_EVENTS - count;
    elements.calibrationNote.textContent =
      `Add ${missing} more past ${missing === 1 ? "event" : "events"} (this year or earlier) to tune your forecast.`;
    return;
  }
  const shifts = Object.entries(calibration.themeShift)
    .map(([group, shift]) => `${Bazi.GROUP_NAMES[group]} years ${shift > 0 ? "+" : "−"}${Math.abs(shift)}`)
    .join(", ");
  elements.calibrationNote.innerHTML = `
    Based on ${count} past events, ${shifts
      ? `your forecast from ${CURRENT_YEAR} on is tuned: ${shifts}.`
      : "your forecast has not changed."}
    <span class="muted">With few events this could be coincidence, and fitting your past doesn't prove the future.</span>`;
}

// Picks the chart to use: the birth data as entered, or, for an unknown hour, the hour that
// past events fit best (once there are enough of them).
function chooseBirthData() {
  state.hourEstimate = state.hourCandidates
    ? Bazi.rectifyHour(state.hourCandidates, state.events, CURRENT_YEAR)
    : null;
  const estimated = Boolean(state.hourEstimate && state.hourEstimate.clear);
  const data = estimated ? state.hourEstimate.ranking[0].candidate : state.birthData;
  state.chart = data.chart;
  state.timeline = data.timeline;
  renderPillars(data.chart, estimated);
  return data;
}

function recalculate() {
  const { yunStart, solarTime } = chooseBirthData();
  const adjusted = Bazi.adjustStrengthForEvents(state.chart, state.timeline, state.events, CURRENT_YEAR);
  state.adjustedChart = adjusted.chart;
  state.strengthShift = adjusted.shift;
  const chart = adjusted.chart;
  const calibration = Bazi.calibrate(chart, state.timeline, state.events, CURRENT_YEAR);
  state.points = Bazi.buildLifeCurve(chart, state.timeline, state.events, calibration);
  state.phases = Bazi.buildPhases(chart, state.points);
  state.followUps = Bazi.followUpForecasts(state.points, state.events, CURRENT_YEAR);
  renderSummary(chart, yunStart, solarTime, state.strengthShift);
  renderChart();
  renderChangeNote();
  renderEvents();
  renderCalibration(calibration);
  renderYearDetail();
}

// Keeps the current curve as the gray "before" line, then recalculates.
function recalculateAfterChange(description) {
  state.previousPoints = state.points;
  state.previousHourBranch = estimatedHourBranch();
  state.lastChange = description;
  recalculate();
}

// ---------- Actions ----------

function showBirth(birth) {
  const data = computeBirthData(birth);
  state.birth = birth;
  state.birthData = data;
  state.hourCandidates = birth.hourKnown ? null : hourCandidates(birth);
  state.previousPoints = null;
  state.chart = data.chart;
  state.timeline = data.timeline;
  // Drop events that fall outside a new birth date's range.
  const first = data.timeline[0].year;
  const last = data.timeline[data.timeline.length - 1].year;
  state.events = state.events.filter((e) => e.year >= first && e.year <= last);

  elements.eventYear.min = first;
  elements.eventYear.max = last;
  elements.results.hidden = false;
  recalculate();
  chartView.resize();
}

elements.hourUnknown.addEventListener("change", () => {
  elements.birthTime.disabled = elements.hourUnknown.checked;
  updatePlaceSelects();
});

elements.birthForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const genderInput = elements.birthForm.querySelector("input[name=gender]:checked");
  const birth = {
    date: elements.birthDate.value,
    time: elements.birthTime.value,
    hourKnown: !elements.hourUnknown.checked,
    place: elements.birthCountry.value
      ? { country: elements.birthCountry.value, region: elements.birthRegion.value, city: elements.birthCity.value }
      : null,
    gender: genderInput ? genderInput.value : null,
  };
  const error = validateBirth(birth);
  elements.birthError.textContent = error || "";
  if (error) return;

  try {
    showBirth(birth);
  } catch (err) {
    console.error(err);
    elements.birthError.textContent = "Something went wrong reading that date. Please check it and try again.";
    return;
  }
  save();
  elements.results.scrollIntoView({ behavior: "smooth" });
});

elements.eventForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const year = Number(elements.eventYear.value);
  const title = elements.eventTitle.value.trim();
  const category = elements.eventCategory.value;
  const error = validateEvent(year, title, category);
  elements.eventError.textContent = error || "";
  if (error) return;

  const details = {
    year,
    title,
    impact: Number(elements.eventImpact.value),
    category,
    lasting: elements.eventLasting.value === "true",
  };
  let description;
  if (state.editingId) {
    const index = state.events.findIndex((e) => e.id === state.editingId);
    description = `editing "${state.events[index].title}"`;
    state.events[index] = { ...state.events[index], ...details };
  } else {
    state.events.push({ id: crypto.randomUUID(), ...details });
    description = `adding "${title}"`;
  }
  state.selectedYear = year;
  stopEditing();
  save();
  recalculateAfterChange(description);
});

// Fills the form with an event so it can be changed; the submit button then saves it.
function startEditing(id) {
  const event = state.events.find((e) => e.id === id);
  state.editingId = id;
  elements.eventYear.value = event.year;
  elements.eventTitle.value = event.title;
  elements.eventCategory.value = event.category || "other";
  elements.eventImpact.value = String(event.impact);
  elements.eventLasting.value = String(Boolean(event.lasting));
  elements.eventError.textContent = "";
  elements.eventSubmit.textContent = "Save changes";
  elements.eventCancel.hidden = false;
  renderEvents();
  elements.eventForm.scrollIntoView({ behavior: "smooth", block: "center" });
  elements.eventTitle.focus({ preventScroll: true });
}

function stopEditing() {
  state.editingId = null;
  elements.eventForm.reset();
  elements.eventSubmit.textContent = "Add event";
  elements.eventCancel.hidden = true;
}

elements.eventCancel.addEventListener("click", () => {
  stopEditing();
  elements.eventError.textContent = "";
  renderEvents();
});

elements.eventList.addEventListener("click", (event) => {
  const editButton = event.target.closest("button.edit");
  if (editButton) {
    startEditing(editButton.dataset.id);
    return;
  }
  const button = event.target.closest("button.delete");
  if (!button) return;
  if (button.dataset.id === state.editingId) stopEditing();
  const removed = state.events.find((e) => e.id === button.dataset.id);
  state.events = state.events.filter((e) => e.id !== button.dataset.id);
  save();
  recalculateAfterChange(`deleting "${removed.title}"`);
});

// Re-render on resize too, since phase labels are sized to the chart's width.
window.addEventListener("resize", () => {
  if (!chartView) return;
  chartView.resize();
  if (state.points.length) renderChart();
});
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => state.points.length && renderChart());

// ---------- Theme ----------

// "auto" follows the computer's light or dark setting; "light" and "dark" override it.
function applyTheme(theme) {
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  if (state.points.length) renderChart();
}

function setUpThemePicker() {
  const picker = document.getElementById("theme-picker");
  let saved = "auto";
  try {
    saved = localStorage.getItem(THEME_KEY) || "auto";
  } catch {
    // Storage blocked: start with the computer's setting.
  }
  picker.value = saved;
  applyTheme(saved);
  picker.addEventListener("change", () => {
    applyTheme(picker.value);
    try {
      localStorage.setItem(THEME_KEY, picker.value);
    } catch {
      // Storage blocked: the theme still applies until the page is closed.
    }
  });
}

// ---------- Start ----------

function fillSelect(select, prompt, names) {
  select.replaceChildren(new Option(prompt, ""), ...names.map((name) => new Option(name, name)));
}

function fillRegions() {
  const country = BIRTH_COUNTRIES.find((c) => c.name === elements.birthCountry.value);
  fillSelect(elements.birthRegion, "Choose…", country ? country.regions.map((r) => r.name) : []);
  if (country && country.regions.length === 1) elements.birthRegion.selectedIndex = 1;
}

function fillCities() {
  const country = BIRTH_COUNTRIES.find((c) => c.name === elements.birthCountry.value);
  const region = country && country.regions.find((r) => r.name === elements.birthRegion.value);
  const cities = region ? Object.keys(region.cities) : [];
  fillSelect(elements.birthCity, "Choose…", cities);
  if (cities.length === 1) elements.birthCity.selectedIndex = 1;
}

// Each select is usable only once the one before it is chosen and the birth time is known.
function updatePlaceSelects() {
  const unknown = elements.hourUnknown.checked;
  elements.birthCountry.disabled = unknown;
  elements.birthRegion.disabled = unknown || !elements.birthCountry.value;
  elements.birthCity.disabled = unknown || !elements.birthRegion.value;
}

function showSavedPlace(place) {
  if (place) {
    elements.birthCountry.value = place.country;
    fillRegions();
    elements.birthRegion.value = place.region;
    fillCities();
    elements.birthCity.value = place.city;
  }
  updatePlaceSelects();
}

function fillBirthPlaces() {
  for (const country of BIRTH_COUNTRIES) elements.birthCountry.add(new Option(country.name, country.name));
  elements.birthCountry.addEventListener("change", () => {
    fillRegions();
    fillCities();
    updatePlaceSelects();
  });
  elements.birthRegion.addEventListener("change", () => {
    fillCities();
    updatePlaceSelects();
  });
}

// Fills the event type list and the common-event suggestions; picking a suggestion fills its details.
function setUpEventForm() {
  for (const [value, category] of Object.entries(Bazi.EVENT_CATEGORIES)) {
    elements.eventCategory.add(new Option(category.en, value));
  }
  for (const title of Object.keys(PRESET_EVENTS)) elements.eventPresets.append(new Option(title));
  elements.eventTitle.addEventListener("input", () => {
    const preset = PRESET_EVENTS[elements.eventTitle.value.trim()];
    if (!preset) return;
    elements.eventCategory.value = preset.category;
    elements.eventImpact.value = String(preset.impact);
    elements.eventLasting.value = String(preset.lasting);
  });
}

function start() {
  setUpThemePicker();
  fillBirthPlaces();
  setUpEventForm();
  if (typeof Solar === "undefined" || typeof echarts === "undefined") {
    elements.birthError.textContent = "The chart tools didn't load. Check your internet connection and refresh the page.";
    return;
  }
  const saved = loadSaved();
  if (!saved) return;

  elements.birthDate.value = saved.birth.date;
  elements.birthTime.value = saved.birth.time || "";
  elements.hourUnknown.checked = !saved.birth.hourKnown;
  elements.birthTime.disabled = !saved.birth.hourKnown;
  showSavedPlace(saved.birth.place || placeFromLegacyId(saved.birth.placeId));
  const genderInput = elements.birthForm.querySelector(`input[name=gender][value=${saved.birth.gender}]`);
  if (genderInput) genderInput.checked = true;
  state.events = Array.isArray(saved.events) ? saved.events : [];
  try {
    showBirth(saved.birth);
  } catch (err) {
    console.error(err);
  }
  // The chart draws on a canvas, so it must redraw once the web fonts arrive.
  document.fonts.ready.then(() => {
    if (chartView) renderChart();
  });
}

start();
