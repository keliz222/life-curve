// Fortune scoring for a Bazi (八字) chart.
// Pure functions only: no DOM and no lunar-javascript, so the logic can be tested on its own.
// app.js turns the lunar-javascript output into the plain objects used here.

const Bazi = (() => {
  const ELEMENTS = ["木", "火", "土", "金", "水"];

  const STEM_ELEMENT = {
    甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
    己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
  };

  // Hidden stems (藏干) of each branch, main stem first.
  const HIDDEN_STEMS = {
    子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"],
    辰: ["戊", "乙", "癸"], 巳: ["丙", "庚", "戊"], 午: ["丁", "己"], 未: ["己", "丁", "乙"],
    申: ["庚", "壬", "戊"], 酉: ["辛"], 戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
  };

  const HIDDEN_WEIGHTS = { 1: [1], 2: [0.7, 0.3], 3: [0.6, 0.3, 0.1] };

  // 六冲 and 六合 pairs between branches.
  const CLASH_PAIRS = ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"];
  const COMBINE_PAIRS = ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"];

  // English names for the five elements, keyed by the Chinese character.
  const ELEMENT_NAMES = { 木: "Wood", 火: "Fire", 土: "Earth", 金: "Metal", 水: "Water" };

  // Odd stems are yang, even stems are yin; each branch is a zodiac animal.
  const YANG_STEMS = "甲丙戊庚壬";
  const BRANCH_ANIMALS = {
    子: "Rat", 丑: "Ox", 寅: "Tiger", 卯: "Rabbit", 辰: "Dragon", 巳: "Snake",
    午: "Horse", 未: "Goat", 申: "Monkey", 酉: "Rooster", 戌: "Dog", 亥: "Pig",
  };

  // Ten-god groups, named from the day master's point of view.
  const GROUP_NAMES = {
    same: "Companion",
    resource: "Resource",
    output: "Output",
    wealth: "Wealth",
    power: "Authority",
  };

  const GROUP_MEANINGS = {
    same: "self & friends",
    resource: "learning & support",
    output: "talent & ideas",
    wealth: "money & chances",
    power: "career & rules",
  };

  // One-phrase summaries for a 10-year luck cycle, by how good it is overall.
  // Adult phrases also depend on the cycle's ten-god group; childhood and old age do not.
  const PHASE_PHRASES = {
    youth: {
      high: { en: "Carefree childhood", zh: "无忧无虑" },
      mid: { en: "Growing up", zh: "茁壮成长" },
      low: { en: "Early hardships", zh: "少年多磨" },
    },
    same: {
      high: { en: "Riding high", zh: "意气风发" },
      mid: { en: "Standing on your own", zh: "自立自强" },
      low: { en: "Rivals everywhere", zh: "四面楚歌" },
    },
    resource: {
      high: { en: "Helped by mentors", zh: "贵人相助" },
      mid: { en: "Learning and growing", zh: "学有所成" },
      low: { en: "On your own", zh: "孤立无援" },
    },
    output: {
      high: { en: "Talent shines", zh: "才华横溢" },
      mid: { en: "Quietly building up", zh: "厚积薄发" },
      low: { en: "Talent unseen", zh: "怀才不遇" },
    },
    wealth: {
      high: { en: "Money flows in", zh: "财源广进" },
      mid: { en: "Saving bit by bit", zh: "积少成多" },
      low: { en: "Money is tight", zh: "量入为出" },
    },
    power: {
      high: { en: "Career success", zh: "事业有成" },
      mid: { en: "Climbing steadily", zh: "步步高升" },
      low: { en: "Under pressure", zh: "砥砺前行" },
    },
    late: {
      high: { en: "Golden years", zh: "福寿安康" },
      mid: { en: "Peaceful years", zh: "安享晚年" },
      low: { en: "Slow down and rest", zh: "修身养性" },
    },
  };

  // A phase whose average score is at or above HIGH is "high", at or below LOW is "low".
  const PHASE_HIGH = 58;
  const PHASE_LOW = 42;
  // Phases centred before YOUTH_AGE or from LATE_AGE on use the childhood / old-age phrases.
  const YOUTH_AGE = 16;
  const LATE_AGE = 65;
  // A phase shorter than this (such as a few months before the first luck cycle) joins the next one.
  const MIN_PHASE_YEARS = 3;

  // Forecasts for a single future year: a short label for the chart and a sentence for the
  // detail panel. Chosen by the year's theme, whether it is going well, and the life stage.
  const PREDICTIONS = {
    same: {
      good: {
        school: ["New close friend", "A new friend or team becomes a big part of your life, and a club or group project goes well."],
        early: ["Teaming up", "A friend or peer pulls you into something new: a side project, a startup idea, or a big trip."],
        middle: ["Strong network", "Old friends and colleagues open doors; a reunion or a referral leads somewhere useful."],
        late: ["Old friends return", "You reconnect with old friends, and a shared hobby fills your days."],
      },
      bad: {
        school: ["Friend drama", "A falling-out with a friend or a tough rival in class. Don't lend money or take sides."],
        early: ["Competition", "Someone competes for the same job or credit. Keep records of your work and don't overshare plans."],
        middle: ["Money with friends", "A partnership or a loan to a friend goes wrong. Keep business and friendship apart."],
        late: ["Family disagreements", "Disagreements with relatives over money or care. Talk early and plainly."],
      },
    },
    resource: {
      good: {
        school: ["Exam success", "A big exam or application goes your way, and a teacher notices you and helps."],
        early: ["A mentor appears", "A senior person takes you under their wing, and a course or certificate pays off."],
        middle: ["Recognition", "A promotion backed by someone above you, or a qualification that raises your standing."],
        late: ["Well looked after", "Family takes good care of you; a good time to learn something new just for fun."],
      },
      bad: {
        school: ["Study slump", "Grades slip or an application is turned down. Ask for help early instead of cramming."],
        early: ["Lost backing", "A supportive boss or mentor leaves, and you need to prove yourself again."],
        middle: ["Paperwork trouble", "Contracts, documents, or a property matter need extra care. Read before you sign."],
        late: ["Mind your health", "Pay attention to rest and check-ups, and let others help you more."],
      },
    },
    output: {
      good: {
        school: ["Talent noticed", "A performance, competition, or creative project gets you noticed."],
        early: ["Creative breakthrough", "Something you make (a portfolio, a post, a product) gets real attention."],
        middle: ["Ideas pay off", "A new idea at work or a side business starts to take off."],
        late: ["Sharing your skills", "Teaching, writing, or a hobby brings you joy and maybe a little income."],
      },
      bad: {
        school: ["Said too much", "Words or posts cause trouble with a teacher or friend. Think before you speak."],
        early: ["Clash with a boss", "Speaking up too bluntly causes friction at work. Pick your battles."],
        middle: ["Overstretched", "Too many projects at once, and one of them stalls. Focus on what matters."],
        late: ["Restless year", "Plans keep changing and things feel unsettled. Keep your routine simple."],
      },
    },
    wealth: {
      good: {
        school: ["Paid opportunity", "A scholarship, a paid internship, or your first real income."],
        early: ["Raise or job offer", "A better-paid job offer or a raise. A good year to negotiate."],
        middle: ["Investment gains", "An investment, property, or business deal pays off."],
        late: ["Comfortable savings", "Your savings hold up well; a good year for the trip you've been wanting."],
      },
      bad: {
        school: ["Money is tight", "Overspending or a surprise cost. Make a budget and stick to it."],
        early: ["Unexpected expense", "A big unplanned cost (rent, a car, a loan). Keep an emergency fund."],
        middle: ["Risky investment", "A deal or investment underperforms. Stay away from quick-money schemes."],
        late: ["Guard your money", "Watch out for scams and lending money. Double-check big payments."],
      },
    },
    power: {
      good: {
        school: ["Leadership role", "You're picked to lead: class rep, team captain, or project lead."],
        early: ["Career step up", "A promotion, a better title, or a job at a respected company."],
        middle: ["Authority grows", "You get more responsibility, and people start relying on your judgement."],
        late: ["Respected elder", "Your experience is valued, and people come to you for advice."],
      },
      bad: {
        school: ["Strict rules", "Pressure from school or parents; a rule or deadline catches you out."],
        early: ["Work pressure", "Heavy workload or a tough manager. Protect your sleep and health."],
        middle: ["Office politics", "Pressure from above or trouble with rules. Be careful and keep things in writing."],
        late: ["Slow down", "Your body asks you to rest. Don't push through stress."],
      },
    },
    // A clash with the day branch means upheaval; a combination means a new bond; a punishment
    // (三刑) means friction and rules; a trine (三合) means many things converging at once.
    punishment: {
      school: ["Trouble with rules", "A penalty, a dispute, or a minor injury. Follow the rules and avoid risky stunts."],
      early: ["Dispute or fine", "A contract dispute, a fine, or a minor injury. Keep paperwork in order and drive carefully."],
      middle: ["Legal headache", "A lawsuit, a dispute at work, or a health scare. Get advice early and don't escalate."],
      late: ["Health check", "A minor operation or a health scare. Keep up your check-ups."],
    },
    trine: {
      good: {
        school: ["Everything clicks", "Friends, teachers, and timing line up, and a long-shot goal comes within reach."],
        early: ["Big opportunity", "Several things converge: the right people and the right opening for a major step."],
        middle: ["Peak year", "Work, family, and money pull in the same direction. A big project can land."],
        late: ["Family gathers", "People come together around you, and a long-held wish comes true."],
      },
      bad: {
        school: ["Pressure piles up", "Everything hits at once. Drop what you can and ask for help."],
        early: ["Overwhelmed", "Demands come from every side. Say no to something before it breaks you."],
        middle: ["Stretched thin", "Work, family, and money all press at once. Protect your health first."],
        late: ["Too much at once", "Family matters pile up. Let others share the load."],
      },
    },
    clash: {
      school: ["Big change", "You change schools, cities, or majors."],
      early: ["Move or job change", "A move to a new city or a job change shakes things up."],
      middle: ["Turning point", "A big shake-up at home or at work. Don't make rushed decisions."],
      late: ["Change of home", "A move, a renovation, or a change in who you live with."],
    },
    combine: {
      school: ["New connection", "A new crush or a close friendship forms."],
      early: ["Romance", "A good year for love: a new relationship, or getting serious with someone."],
      middle: ["Partnership", "A strong partnership forms, at home or in business."],
      late: ["Family joy", "A family celebration: a wedding, a grandchild, or a reunion."],
    },
  };

  // A year counts as good or bad by its change from last year when that is big enough,
  // otherwise by which side of the middle line it is on.
  const NOTABLE_CHANGE = 3;

  // 格局: the chart's structure, set by the main stem of the month branch. `helps` and `hurts`
  // are the ten-god groups that traditionally protect or damage that structure.
  const PATTERNS = {
    directOfficer: { en: "Direct Officer", zh: "正官格", helps: ["wealth", "resource"], hurts: ["output"], meaning: "order, reputation, and steady advancement" },
    sevenKillings: { en: "Seven Killings", zh: "七杀格", helps: ["output", "resource"], hurts: ["wealth"], meaning: "ambition and pressure that must be mastered" },
    directWealth: { en: "Direct Wealth", zh: "正财格", helps: ["power", "output"], hurts: ["same"], meaning: "steady earning through patient work" },
    indirectWealth: { en: "Indirect Wealth", zh: "偏财格", helps: ["power", "output"], hurts: ["same"], meaning: "opportunities, deals, and a wide social circle" },
    directResource: { en: "Direct Resource", zh: "正印格", helps: ["power"], hurts: ["wealth"], meaning: "learning, protection, and good mentors" },
    indirectResource: { en: "Indirect Resource", zh: "偏印格", helps: ["power"], hurts: ["wealth"], meaning: "unusual skills and independent thinking" },
    eatingGod: { en: "Eating God", zh: "食神格", helps: ["wealth"], hurts: ["resource"], meaning: "talent, enjoyment, and an easy-going nature" },
    hurtingOfficer: { en: "Hurting Officer", zh: "伤官格", helps: ["wealth", "resource"], hurts: ["power"], meaning: "brilliance and a dislike of rules" },
    establishedProsperity: { en: "Established Prosperity", zh: "建禄格", helps: ["power", "wealth"], hurts: ["same"], meaning: "self-reliance and building things yourself" },
    monthBlade: { en: "Month Blade", zh: "月刃格", helps: ["power", "wealth"], hurts: ["same"], meaning: "drive and sharp competitiveness" },
  };
  // An element "helps" or "strains" a chart when its favor is beyond this; in between it is neutral.
  const FEELING_THRESHOLD = 0.25;

  // How much a chart's pattern moves a ten-god group's favor (on the -1..1 scale).
  const PATTERN_WEIGHT = 0.2;

  // 调候: a chart born in a cold or hot season needs the opposite element to balance it.
  const CLIMATE_NEEDS = {
    亥: { season: "winter", element: "火" }, 子: { season: "winter", element: "火" }, 丑: { season: "winter", element: "火" },
    巳: { season: "summer", element: "水" }, 午: { season: "summer", element: "水" }, 未: { season: "summer", element: "水" },
  };
  const CLIMATE_WEIGHT = 0.35;

  // 三合: three branches that merge into one element.
  const TRINES = [
    { branches: "申子辰", element: "水" },
    { branches: "亥卯未", element: "木" },
    { branches: "寅午戌", element: "火" },
    { branches: "巳酉丑", element: "金" },
  ];
  // 三刑: the groups below punish when complete. 子卯 is a pair; 自刑 needs a branch to repeat.
  const PUNISHMENT_GROUPS = ["寅巳申", "丑戌未", "子卯"];
  const SELF_PUNISHMENT_BRANCHES = "辰午酉亥";
  // Score points in a year: trine scaled by its element's favor, punishment as a flat loss.
  const TRINE_POINTS = 7;
  const PUNISHMENT_POINTS = 5;

  // 身强/身弱: at or above STRONG_THRESHOLD of support the day master counts as strong. Within
  // BALANCE_BAND around it, the strong and weak readings blend.
  const STRONG_THRESHOLD = 0.45;
  const BALANCE_BAND = 0.16;
  const STRONG_GROUP_FAVOR = { same: -0.9, resource: -0.7, output: 0.7, wealth: 1, power: 0.6 };
  const WEAK_GROUP_FAVOR = { same: 0.8, resource: 1, output: -0.6, wealth: -0.8, power: -1 };
  // How far past events can move the support ratio, and how strongly each one counts.
  const MAX_SUPPORT_SHIFT = 0.02;
  const SUPPORT_SHIFT_PER_EVIDENCE = 0.02;

  // Kinds of life event, each tied to the ten-god theme that rules it. Love depends on gender:
  // a man's partner is his Wealth star and a woman's is her Authority star. Other has no theme.
  const EVENT_CATEGORIES = {
    study: { en: "Study", theme: "resource" },
    career: { en: "Career", theme: "power" },
    money: { en: "Money", theme: "wealth" },
    love: { en: "Love", theme: { male: "wealth", female: "power" } },
    family: { en: "Family", theme: "resource" },
    health: { en: "Health", theme: "same" },
    move: { en: "Move or travel", theme: "output" },
    friends: { en: "Friends", theme: "same" },
    other: { en: "Other", theme: null },
  };

  // 生 cycle of the themes: each one produces the next (比劫 → 食伤 → 财 → 官杀 → 印 → 比劫).
  const THEME_CYCLE = ["same", "output", "wealth", "power", "resource"];

  // An event moves every later year a little (fading), and years of its own theme more.
  const EVENT_GENERAL_POINTS = 3;
  const EVENT_THEME_POINTS = 2.5;
  // 生: the theme it produces moves the same way, by this share. 克: the theme it controls
  // moves the opposite way, by this share.
  const EVENT_PRODUCES_SHARE = 0.5;
  const EVENT_CONTROLS_SHARE = 0.3;
  // How much the chart's liking for a theme amplifies or softens an event (can the chart hold it?).
  const EVENT_FAVOR_WEIGHT = 0.4;
  // Fading, in years: one-time events fade faster; lasting changes keep their theme effect.
  const ONE_TIME_FADE_YEARS = 4;
  const ONE_TIME_THEME_FADE_YEARS = 8;
  const LASTING_GENERAL_SHARE = 0.5;
  const ONE_TIME_GENERAL_SHARE = 0.25;

  // What an event tends to lead to: a window of years after it and the themes that suit it.
  const FOLLOW_UPS = {
    study: {
      good: { from: 3, to: 5, themes: ["power", "wealth"], short: "Graduation and first job", text: "Your studies pay off with a qualification and a first real role." },
      bad: { from: 1, to: 3, themes: ["resource"], short: "A second chance at study", text: "A new course, exam, or school gives you another way in." },
    },
    career: {
      good: { from: 2, to: 5, themes: ["power", "resource"], short: "Promotion", text: "The step you took grows into more responsibility and a better title." },
      bad: { from: 1, to: 4, themes: ["power", "wealth"], short: "Recovery: a new role", text: "After the setback, a new job or direction opens up." },
    },
    money: {
      good: { from: 2, to: 6, themes: ["wealth"], short: "A big purchase", text: "Your money grows enough for a home, a car, or an investment." },
      bad: { from: 1, to: 4, themes: ["wealth", "output"], short: "Money recovers", text: "Income comes back, often from a skill or side work." },
    },
    love: {
      good: { from: 1, to: 4, themes: ["wealth", "power"], combine: true, short: "Commitment", text: "The relationship deepens: moving in, an engagement, or marriage." },
      bad: { from: 1, to: 4, themes: ["wealth", "power"], combine: true, short: "Someone new", text: "After the heartbreak, a new person comes into your life." },
    },
    family: {
      good: { from: 1, to: 5, themes: ["output", "resource"], short: "The family grows", text: "A new family member, or a closer, happier home." },
      bad: { from: 2, to: 5, themes: ["resource"], short: "Family makes peace", text: "Old tensions ease and the family pulls together." },
    },
    health: {
      good: { from: 1, to: 3, themes: ["same"], short: "Full of energy", text: "Your health stays strong and you take on something physical." },
      bad: { from: 1, to: 3, themes: ["resource", "same"], short: "Full recovery", text: "Rest and care bring you back to full strength." },
    },
    move: {
      good: { from: 1, to: 3, themes: ["same", "output"], short: "Settling in", text: "The new place starts to feel like home, with a new circle of friends." },
      bad: { from: 2, to: 5, themes: ["output"], clash: true, short: "Moving again", text: "The place doesn't stick, and another move follows." },
    },
    friends: {
      good: { from: 2, to: 5, themes: ["same", "wealth"], short: "A partnership", text: "A friend becomes a partner in a project or business." },
      bad: { from: 1, to: 3, themes: ["same"], short: "A new circle", text: "You find new friends who suit you better." },
    },
  };

  // The 12 two-hour periods (时辰), each named by its branch, with clock times for display.
  const HOUR_BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
  const HOUR_TIMES = [
    "11 pm–1 am", "1–3 am", "3–5 am", "5–7 am", "7–9 am", "9–11 am",
    "11 am–1 pm", "1–3 pm", "3–5 pm", "5–7 pm", "7–9 pm", "9–11 pm",
  ];
  // Estimating an unknown birth hour from past events needs at least this many.
  const MIN_RECTIFY_EVENTS = 3;
  // The best hour must fit at least this much better than the next one to count as clear.
  const MIN_FIT_MARGIN = 0.3;

  // Calibration from the user's past events needs at least this many to run at all.
  const MIN_CALIBRATION_EVENTS = 3;
  // Points a theme's future years move per level of average impact, before shrinking.
  const THEME_POINTS_PER_LEVEL = 4;
  // Counted as extra neutral events, so one or two events can't swing a theme much.
  const THEME_NEUTRAL_EVENTS = 2;
  const MAX_THEME_SHIFT = 10;

  // An event's impact (-3..3) moves the curve by this many points in the year it happens.
  const EVENT_POINTS_PER_LEVEL = 6;
  // Part of an event's effect that stays forever; the rest fades over EVENT_FADE_YEARS.
  const EVENT_LASTING_SHARE = 0.4;
  const EVENT_FADE_YEARS = 5;

  function isYangStem(stem) {
    return "甲丙戊庚壬".includes(stem);
  }

  function generates(element) {
    return ELEMENTS[(ELEMENTS.indexOf(element) + 1) % 5];
  }

  function controls(element) {
    return ELEMENTS[(ELEMENTS.indexOf(element) + 2) % 5];
  }

  // How `element` relates to the day master's element.
  function relationTo(dayElement, element) {
    if (element === dayElement) return "same";
    if (generates(element) === dayElement) return "resource";
    if (generates(dayElement) === element) return "output";
    if (controls(dayElement) === element) return "wealth";
    return "power";
  }

  function isPair(pairs, a, b) {
    return pairs.includes(a + b) || pairs.includes(b + a);
  }

  // Element weights of one branch, spread over its hidden stems.
  function branchElements(branch) {
    const stems = HIDDEN_STEMS[branch];
    const weights = HIDDEN_WEIGHTS[stems.length];
    const result = {};
    stems.forEach((stem, i) => {
      const element = STEM_ELEMENT[stem];
      result[element] = (result[element] || 0) + weights[i];
    });
    return result;
  }

  // 格局 from the month branch's main hidden stem, read against the day stem.
  function findPattern(dayStem, monthBranch) {
    const monthStem = HIDDEN_STEMS[monthBranch][0];
    const samePolarity = isYangStem(monthStem) === isYangStem(dayStem);
    const relation = relationTo(STEM_ELEMENT[dayStem], STEM_ELEMENT[monthStem]);
    const keys = {
      same: samePolarity ? "establishedProsperity" : "monthBlade",
      resource: samePolarity ? "indirectResource" : "directResource",
      output: samePolarity ? "eatingGod" : "hurtingOfficer",
      wealth: samePolarity ? "indirectWealth" : "directWealth",
      power: samePolarity ? "sevenKillings" : "directOfficer",
    };
    return PATTERNS[keys[relation]];
  }

  // pillars: { year: "庚午", month: "辛巳", day: "庚辰", time: "癸未" | null }
  // A null time pillar means the birth hour is unknown and is left out.
  // supportShift nudges the support ratio, after the user's events lean the chart stronger or weaker.
  function analyzeChart(pillars, supportShift = 0) {
    const strength = Object.fromEntries(ELEMENTS.map((e) => [e, 0]));
    const add = (element, amount) => {
      strength[element] += amount;
    };

    for (const key of ["year", "month", "day", "time"]) {
      const pillar = pillars[key];
      if (!pillar) continue;
      add(STEM_ELEMENT[pillar[0]], 1);
      // The month branch rules the season (得令), so it counts double.
      const branchWeight = key === "month" ? 2 : 1;
      for (const [element, weight] of Object.entries(branchElements(pillar[1]))) {
        add(element, weight * branchWeight);
      }
    }

    const dayStem = pillars.day[0];
    const dayElement = STEM_ELEMENT[dayStem];
    const total = ELEMENTS.reduce((sum, e) => sum + strength[e], 0);
    const support = strength[dayElement] + strength[ELEMENTS.find((e) => generates(e) === dayElement)];
    const naturalSupportRatio = support / total;
    const supportRatio = clamp(naturalSupportRatio + supportShift, 0, 1);
    const isStrong = supportRatio >= STRONG_THRESHOLD;

    // A strong day master wants to be drained or controlled; a weak one wants support. Near the
    // threshold the two readings blend, so a chart close to balance is not forced to one side.
    const strongShare = strongReadingShare(supportRatio);
    const groupFavor = Object.fromEntries(
      Object.keys(STRONG_GROUP_FAVOR).map((group) => [
        group,
        strongShare * STRONG_GROUP_FAVOR[group] + (1 - strongShare) * WEAK_GROUP_FAVOR[group],
      ]),
    );

    const monthBranch = pillars.month[1];
    const pattern = findPattern(dayStem, monthBranch);
    const climate = CLIMATE_NEEDS[monthBranch] || null;

    const favor = Object.fromEntries(
      ELEMENTS.map((e) => {
        const group = relationTo(dayElement, e);
        let value = groupFavor[group];
        if (pattern.helps.includes(group)) value += PATTERN_WEIGHT;
        if (pattern.hurts.includes(group)) value -= PATTERN_WEIGHT;
        if (climate && climate.element === e) value += CLIMATE_WEIGHT;
        return [e, clamp(value, -1, 1)];
      }),
    );
    const favorable = ELEMENTS.filter((e) => favor[e] > FEELING_THRESHOLD).sort((a, b) => favor[b] - favor[a]);

    return {
      pillars,
      dayStem,
      dayBranch: pillars.day[1],
      branches: ["year", "month", "day", "time"].filter((key) => pillars[key]).map((key) => pillars[key][1]),
      pattern,
      climate,
      dayElement,
      strength,
      supportRatio,
      naturalSupportRatio,
      strengthLabel: strengthLabel(supportRatio),
      isStrong,
      favor,
      favorable,
    };
  }

  // How much of the "strong" reading applies, from 0 (fully weak) to 1 (fully strong).
  function strongReadingShare(supportRatio) {
    return clamp(0.5 + (supportRatio - STRONG_THRESHOLD) / BALANCE_BAND, 0, 1);
  }

  function strengthLabel(supportRatio) {
    const share = strongReadingShare(supportRatio);
    if (share === 1) return "strong";
    if (share === 0) return "weak";
    return share >= 0.5 ? "slightly strong" : "slightly weak";
  }

  // How good a stem-branch pair (大运 or 流年) is for this chart, from -1 to 1.
  function ganZhiFavor(chart, ganZhi) {
    if (!ganZhi) return 0;
    const stemFavor = chart.favor[STEM_ELEMENT[ganZhi[0]]];
    let branchFavor = 0;
    for (const [element, weight] of Object.entries(branchElements(ganZhi[1]))) {
      branchFavor += chart.favor[element] * weight;
    }
    return 0.55 * stemFavor + 0.45 * branchFavor;
  }

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  // Trine and punishment set off by this year's branch, with the luck cycle's and birth chart's.
  function branchInteractions(chart, daYun, liuNian) {
    const yearBranch = liuNian[1];
    const present = new Set([...chart.branches, ...(daYun ? [daYun[1]] : [])]);
    const othersPresent = (group) => [...group].every((b) => b === yearBranch || present.has(b));

    const trine = TRINES.find((t) => t.branches.includes(yearBranch) && othersPresent(t.branches));
    const punishmentGroup = PUNISHMENT_GROUPS.find((g) => g.includes(yearBranch) && othersPresent(g));
    const selfPunishment = SELF_PUNISHMENT_BRANCHES.includes(yearBranch) && chart.branches.includes(yearBranch);

    return {
      trine: trine ? { element: trine.element, favorable: chart.favor[trine.element] >= 0 } : null,
      trinePoints: trine ? TRINE_POINTS * chart.favor[trine.element] : 0,
      punished: Boolean(punishmentGroup || selfPunishment),
    };
  }

  // The theme an event's category rules, or null for "other" and old events without a category.
  function eventTheme(category, gender) {
    const theme = (EVENT_CATEGORIES[category] || EVENT_CATEGORIES.other).theme;
    if (theme && typeof theme === "object") return theme[gender] || theme.male;
    return theme;
  }

  function themeElement(chart, theme) {
    return ELEMENTS.find((e) => relationTo(chart.dayElement, e) === theme);
  }

  // How a year of `yearTheme` is affected by an event of `eventThemeName`: 1 for the same theme,
  // positive for the theme it produces (生), negative for the theme it controls (克), else 0.
  function themeLink(eventThemeName, yearTheme) {
    const i = THEME_CYCLE.indexOf(eventThemeName);
    if (i < 0) return 0;
    if (yearTheme === eventThemeName) return 1;
    if (yearTheme === THEME_CYCLE[(i + 1) % 5]) return EVENT_PRODUCES_SHARE;
    if (yearTheme === THEME_CYCLE[(i + 2) % 5]) return -EVENT_CONTROLS_SHARE;
    return 0;
  }

  // Points the user's events add to one year, split into the general push, the carry-over into
  // years of the event's own theme, and the 生克 ripple into related themes.
  // events: [{ year, impact (-3..3), category, lasting }]
  function eventEffects(chart, events, year, yearTheme) {
    const effects = { general: 0, theme: 0, ripple: 0 };
    for (const event of events) {
      if (event.year > year) continue;
      const yearsSince = year - event.year;
      const fade = Math.exp(-yearsSince / ONE_TIME_FADE_YEARS);
      const generalShare = event.lasting
        ? LASTING_GENERAL_SHARE + (1 - LASTING_GENERAL_SHARE) * fade
        : ONE_TIME_GENERAL_SHARE + (1 - ONE_TIME_GENERAL_SHARE) * fade;
      effects.general += event.impact * EVENT_GENERAL_POINTS * generalShare;

      const theme = eventTheme(event.category, chart.gender);
      const link = yearsSince > 0 ? themeLink(theme, yearTheme) : 0;
      if (link === 0) continue;
      // Good news in a theme the chart likes is amplified; bad news there is softened.
      const favor = chart.favor[themeElement(chart, theme)];
      const holding = 1 + EVENT_FAVOR_WEIGHT * favor * Math.sign(event.impact);
      const persist = event.lasting ? 1 : Math.exp(-yearsSince / ONE_TIME_THEME_FADE_YEARS);
      const points = event.impact * EVENT_THEME_POINTS * holding * persist * link;
      if (link === 1) effects.theme += points;
      else effects.ripple += points;
    }
    return effects;
  }

  // The total points events add to a year, for any theme of that year.
  function eventEffect(chart, events, year, yearTheme) {
    const effects = eventEffects(chart, events, year, yearTheme);
    return effects.general + effects.theme + effects.ripple;
  }

  // Past events read against the luck of their years: good events in years that suit a strong
  // day master (and bad ones in years that suit a weak one) lean the chart stronger, and the
  // other way round. Returns the chart re-read with that lean, and how far it moved.
  function adjustStrengthForEvents(chart, timeline, events, fromYear) {
    const pastEvents = events.filter((event) => event.year <= fromYear);
    let evidence = 0;
    for (const event of pastEvents) {
      const entry = timeline.find((t) => t.year === event.year);
      if (!entry) continue;
      const strongScore = readingScore(chart, STRONG_GROUP_FAVOR, entry);
      const weakScore = readingScore(chart, WEAK_GROUP_FAVOR, entry);
      evidence += event.impact * (strongScore - weakScore);
    }
    const shift = round(
      clamp((SUPPORT_SHIFT_PER_EVIDENCE * evidence) / (pastEvents.length + 3), -MAX_SUPPORT_SHIFT, MAX_SUPPORT_SHIFT) * 1000,
    ) / 1000;
    const adjusted = analyzeChart(chart.pillars, shift);
    adjusted.gender = chart.gender;
    return { chart: adjusted, shift };
  }

  // How good a timeline year is under one reading of the chart, ignoring pattern and climate.
  function readingScore(chart, groupFavor, entry) {
    const favor = Object.fromEntries(ELEMENTS.map((e) => [e, groupFavor[relationTo(chart.dayElement, e)]]));
    const simpleChart = { favor };
    return 20 * ganZhiFavor(simpleChart, entry.daYun) + 14 * ganZhiFavor(simpleChart, entry.liuNian);
  }

  // timeline: [{ year, age, daYun: "丙戌" | null, liuNian: "甲辰" }], one entry per year.
  // events: [{ year, title, impact, category, lasting }], impact from -3 to 3.
  // Returns one point per year: { year, age, score (0-100), change from last year, ... }.
  // calibration: optional result of calibrate(), which shifts years from its fromYear on.
  function buildLifeCurve(chart, timeline, events = [], calibration = null) {
    const points = [];
    let previousScore = 50;

    for (const entry of timeline) {
      const daYunScore = ganZhiFavor(chart, entry.daYun);
      const liuNianScore = ganZhiFavor(chart, entry.liuNian);
      const branch = entry.liuNian[1];
      const clashesDay = isPair(CLASH_PAIRS, branch, chart.dayBranch);
      const combinesDay = isPair(COMBINE_PAIRS, branch, chart.dayBranch);

      const interactions = branchInteractions(chart, entry.daYun, entry.liuNian);

      const factors = [
        { key: "luckCycle", label: "Luck cycle", points: 20 * daYunScore },
        { key: "year", label: "This year's elements", points: 14 * liuNianScore },
        { key: "clash", label: "Clash with day branch", points: clashesDay ? -6 : 0 },
        { key: "combine", label: "Combination with day branch", points: combinesDay ? 4 : 0 },
        {
          key: "trine",
          label: `${interactions.trine ? ELEMENT_NAMES[interactions.trine.element] : ""} trine`,
          points: interactions.trinePoints,
        },
        { key: "punishment", label: "Punishment", points: interactions.punished ? -PUNISHMENT_POINTS : 0 },
      ];
      const baseLevel = clamp(50 + factors.reduce((sum, f) => sum + f.points, 0), 8, 92);
      const group = relationTo(chart.dayElement, STEM_ELEMENT[entry.liuNian[0]]);
      const themeShift = calibration && entry.year >= calibration.fromYear ? calibration.themeShift[group] || 0 : 0;
      const effects = eventEffects(chart, events, entry.year, group);
      factors.push(
        { key: "events", label: "Your events", points: effects.general },
        { key: "eventTheme", label: `Carry-over into ${GROUP_NAMES[group]} years`, points: effects.theme },
        { key: "eventRipple", label: "Ripple from related themes (生克)", points: effects.ripple },
        { key: "tuned", label: "Tuned from your past", points: themeShift },
      );
      const eventPoints = effects.general + effects.theme + effects.ripple;
      const score = round(clamp(baseLevel + eventPoints + themeShift, 1, 99));

      points.push({
        year: entry.year,
        age: entry.age,
        daYun: entry.daYun,
        liuNian: entry.liuNian,
        group,
        clashesDay,
        combinesDay,
        trine: interactions.trine,
        punished: interactions.punished,
        factors: factors
          .map((f) => ({ key: f.key, label: f.label, points: round(f.points) }))
          .filter((f) => f.points !== 0),
        events: events.filter((event) => event.year === entry.year),
        score,
        change: round(score - previousScore),
      });
      previousScore = score;
    }
    return points;
  }

  // Splits the curve into phases, one per 10-year luck cycle (大运), plus the years before
  // the first cycle starts. Each phase gets a short summary phrase in English and Chinese.
  function buildPhases(chart, points) {
    let phases = [];
    for (const point of points) {
      const current = phases[phases.length - 1];
      if (current && current.daYun === point.daYun) {
        current.points.push(point);
      } else {
        phases.push({ daYun: point.daYun, points: [point] });
      }
    }
    phases = phases.reduceRight((merged, phase) => {
      const next = merged[0];
      if (next && phase.points.length < MIN_PHASE_YEARS) next.points.unshift(...phase.points);
      else merged.unshift(phase);
      return merged;
    }, []);

    return phases.map(({ daYun, points: phasePoints }) => {
      const first = phasePoints[0];
      const last = phasePoints[phasePoints.length - 1];
      const averageScore = round(phasePoints.reduce((sum, p) => sum + p.score, 0) / phasePoints.length);
      const middleAge = (first.age + last.age) / 2;
      const level = averageScore >= PHASE_HIGH ? "high" : averageScore <= PHASE_LOW ? "low" : "mid";
      let theme;
      if (!daYun || middleAge < YOUTH_AGE) theme = "youth";
      else if (middleAge >= LATE_AGE) theme = "late";
      else theme = relationTo(chart.dayElement, STEM_ELEMENT[daYun[0]]);

      return {
        daYun,
        startYear: first.year,
        endYear: last.year,
        startAge: first.age,
        endAge: last.age,
        averageScore,
        level,
        phrase: PHASE_PHRASES[theme][level],
      };
    });
  }

  // Uses the user's past events (up to and including fromYear) to work out themeShift: points to
  // add to future years of each theme. It stays empty until there are MIN_CALIBRATION_EVENTS.
  function calibrate(chart, timeline, events, fromYear) {
    const pastEvents = events.filter((event) => event.year <= fromYear);
    const result = { fromYear, pastEventCount: pastEvents.length, themeShift: {} };
    if (pastEvents.length < MIN_CALIBRATION_EVENTS) return result;

    const baseCurve = buildLifeCurve(chart, timeline);
    const impactsByTheme = {};
    for (const event of pastEvents) {
      const point = baseCurve.find((p) => p.year === event.year);
      (impactsByTheme[point.group] ||= []).push(event.impact);
    }

    for (const [group, impacts] of Object.entries(impactsByTheme)) {
      const total = impacts.reduce((sum, impact) => sum + impact, 0);
      const shift = (THEME_POINTS_PER_LEVEL * total) / (impacts.length + THEME_NEUTRAL_EVENTS);
      if (shift !== 0) result.themeShift[group] = round(clamp(shift, -MAX_THEME_SHIFT, MAX_THEME_SHIFT));
    }
    return result;
  }

  function lifeStage(age) {
    if (age < 22) return "school";
    if (age < 35) return "early";
    if (age < 60) return "middle";
    return "late";
  }

  // A slightly specific forecast for one year: { short, text }.
  function predictYear(point) {
    const stage = lifeStage(point.age);
    let entry;
    if (point.clashesDay) entry = PREDICTIONS.clash[stage];
    else if (point.punished) entry = PREDICTIONS.punishment[stage];
    else if (point.trine) entry = PREDICTIONS.trine[point.trine.favorable ? "good" : "bad"][stage];
    else if (point.combinesDay) entry = PREDICTIONS.combine[stage];
    else {
      let going;
      if (point.change >= NOTABLE_CHANGE) going = "good";
      else if (point.change <= -NOTABLE_CHANGE) going = "bad";
      else going = point.score >= 50 ? "good" : "bad";
      entry = PREDICTIONS[point.group][going][stage];
    }
    return { short: entry[0], text: entry[1] };
  }

  // The future years worth marking on the chart: in each phase, the year from `fromYear` on
  // with the biggest swing, skipping years that already have the user's own events.
  function keyFutureYears(points, phases, fromYear) {
    const keyYears = [];
    for (const phase of phases) {
      const candidates = points.filter(
        (p) => p.year >= Math.max(fromYear, phase.startYear) && p.year <= phase.endYear && p.events.length === 0,
      );
      if (candidates.length === 0) continue;
      const biggest = candidates.reduce((best, p) => (Math.abs(p.change) > Math.abs(best.change) ? p : best));
      keyYears.push(biggest);
    }
    return keyYears;
  }

  // Forecasts that follow from the user's own events: for each event, the year in its window (from
  // fromYear on) that best suits what it leads to. Returns [{ year, short, text, event }].
  function followUpForecasts(points, events, fromYear) {
    const forecasts = [];
    for (const event of events) {
      const kind = FOLLOW_UPS[event.category];
      if (!kind) continue;
      const followUp = kind[event.impact > 0 ? "good" : "bad"];
      const candidates = points.filter(
        (p) => p.year >= Math.max(fromYear, event.year + followUp.from) && p.year <= event.year + followUp.to,
      );
      if (candidates.length === 0) continue;
      const fit = (p) =>
        (followUp.themes.includes(p.group) ? 20 : 0) +
        (followUp.combine && p.combinesDay ? 10 : 0) +
        (followUp.clash && p.clashesDay ? 10 : 0) +
        p.score / 10;
      const best = candidates.reduce((a, b) => (fit(b) > fit(a) ? b : a));
      forecasts.push({ year: best.year, short: followUp.short, text: followUp.text, event });
    }
    return forecasts.sort((a, b) => a.year - b.year);
  }

  // How a curve changed: average shift of the years before fromYear, and of each theme from then on.
  function describeCurveChange(before, after, fromYear) {
    const past = [];
    const futureByTheme = {};
    after.forEach((point, i) => {
      const diff = point.score - before[i].score;
      if (point.year < fromYear) past.push(diff);
      else (futureByTheme[point.group] ||= []).push(diff);
    });
    const average = (values) => round(values.reduce((sum, v) => sum + v, 0) / values.length);
    return {
      pastAverage: past.length ? average(past) : 0,
      futureByTheme: Object.fromEntries(Object.entries(futureByTheme).map(([theme, diffs]) => [theme, average(diffs)])),
    };
  }

  // "辰" → "Dragon hour (7–9 am)".
  function hourLabel(branch) {
    return `${BRANCH_ANIMALS[branch]} hour (${HOUR_TIMES[HOUR_BRANCHES.indexOf(branch)]})`;
  }

  // 校正: for a chart whose birth hour is unknown, ranks the 12 possible hours by how well past
  // events fit each hour's curve: good events in its high years and bad ones in its low years.
  // candidates: [{ branch, chart, timeline, ... }], one per hour. Returns null with too few
  // events, otherwise { eventCount, clear, ranking: [{ candidate, fit }] } with the best fit first.
  // clear is false when the best hour doesn't fit well or barely beats the next one.
  // fit is the average number of points each event agrees with the curve, weighted by impact.
  function rectifyHour(candidates, events, fromYear) {
    const pastEvents = events.filter((event) => event.year <= fromYear);
    if (pastEvents.length < MIN_RECTIFY_EVENTS) return null;
    const totalImpact = pastEvents.reduce((sum, event) => sum + Math.abs(event.impact), 0);

    const ranking = candidates.map((candidate) => {
      const curve = buildLifeCurve(candidate.chart, candidate.timeline);
      const mean = curve.reduce((sum, p) => sum + p.score, 0) / curve.length;
      let agreement = 0;
      for (const event of pastEvents) {
        const point = curve.find((p) => p.year === event.year);
        if (point) agreement += event.impact * (point.score - mean);
      }
      return { candidate, fit: round(agreement / totalImpact) };
    });
    ranking.sort((a, b) => b.fit - a.fit);
    const clear = ranking[0].fit > 0 && ranking[0].fit - ranking[1].fit >= MIN_FIT_MARGIN;
    return { eventCount: pastEvents.length, clear, ranking };
  }

  // "庚" → "Yang Metal".
  function stemName(stem) {
    return `${YANG_STEMS.includes(stem) ? "Yang" : "Yin"} ${ELEMENT_NAMES[STEM_ELEMENT[stem]]}`;
  }

  // "乙巳" → "Yin Wood Snake".
  function ganZhiName(ganZhi) {
    return `${stemName(ganZhi[0])} ${BRANCH_ANIMALS[ganZhi[1]]}`;
  }

  function round(value) {
    return Math.round(value * 10) / 10;
  }

  // Equation of time in minutes: how far the sun runs ahead of the clock on a day of the year.
  function equationOfTime(dayOfYear) {
    const angle = (2 * Math.PI * (dayOfYear - 81)) / 364;
    return 9.87 * Math.sin(2 * angle) - 7.53 * Math.cos(angle) - 1.5 * Math.sin(angle);
  }

  // Converts clock time to true solar time for a place. Returns the corrected date and time,
  // which may fall on a different day, and the correction in whole minutes.
  function trueSolarTime(clock, longitude, utcOffset) {
    const clockMs = Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute);
    const dayOfYear = Math.floor((clockMs - Date.UTC(clock.year, 0, 0)) / 86400000);
    const correctionMinutes = Math.round(4 * (longitude - 15 * utcOffset) + equationOfTime(dayOfYear));
    const solar = new Date(clockMs + correctionMinutes * 60000);
    return {
      year: solar.getUTCFullYear(),
      month: solar.getUTCMonth() + 1,
      day: solar.getUTCDate(),
      hour: solar.getUTCHours(),
      minute: solar.getUTCMinutes(),
      correctionMinutes,
    };
  }

  // A short English reading of a single year, for the detail panel.
  // How the chart feels about an element, in words: -1..1 favor turned into a verb phrase.
  // "helps", "strains", or "neutral": the one rule the chart summary, the element ring, and the
  // year explanations all use.
  function elementFeeling(chart, element) {
    const favor = chart.favor[element];
    if (favor > FEELING_THRESHOLD) return "helps";
    if (favor < -FEELING_THRESHOLD) return "strains";
    return "neutral";
  }

  function feelingAbout(chart, element) {
    return { helps: "helps you", strains: "strains you", neutral: "neutral" }[elementFeeling(chart, element)];
  }

  // "Fire (Authority: career & rules), neutral". Your own element gets a reason when it strains you,
  // since "your own element strains you" sounds odd on its own.
  function elementInWords(chart, element) {
    const group = relationTo(chart.dayElement, element);
    const feeling = feelingAbout(chart, element);
    if (group === "same") {
      const why = feeling === "strains you" ? "too much already, strains you" : feeling;
      return `${ELEMENT_NAMES[element]} (your own), ${why}`;
    }
    return `${ELEMENT_NAMES[element]} (${GROUP_NAMES[group]}: ${GROUP_MEANINGS[group]}), ${feeling}`;
  }

  // The main element a branch brings, from its first hidden stem.
  function branchMainElement(branch) {
    return STEM_ELEMENT[HIDDEN_STEMS[branch][0]];
  }

  // A plain-English account of one year's score: one line per thing that moved it, each with the
  // points it added, then a closing line. For people who don't know Bazi.
  // Returns { lines: [{ text, points }], summary }.
  function explainYear(chart, point) {
    const points = Object.fromEntries(point.factors.map((f) => [f.key, f.points]));
    const animal = BRANCH_ANIMALS[point.liuNian[1]];
    const dayAnimal = BRANCH_ANIMALS[chart.dayBranch];
    const lines = [];

    if (point.daYun) {
      const stemElement = STEM_ELEMENT[point.daYun[0]];
      const branchElement = branchMainElement(point.daYun[1]);
      const brings = stemElement === branchElement
        ? elementInWords(chart, stemElement)
        : `${elementInWords(chart, stemElement)}; ${elementInWords(chart, branchElement)}`;
      lines.push({
        text: `${ganZhiName(point.daYun)} luck cycle (${point.daYun}): ${brings}.`,
        points: points.luckCycle || 0,
      });
    } else {
      lines.push({ text: "Luck cycles haven't started yet.", points: 0 });
    }

    const yearStem = STEM_ELEMENT[point.liuNian[0]];
    const yearBranch = branchMainElement(point.liuNian[1]);
    const branchPart = yearBranch === yearStem
      ? ""
      : `; ${elementInWords(chart, yearBranch)}`;
    lines.push({
      text: `${point.year} is a ${ganZhiName(point.liuNian)} year (${point.liuNian}): ${elementInWords(chart, yearStem)}${branchPart}.`,
      points: points.year || 0,
    });

    if (points.clash) {
      lines.push({
        text: `${animal} clashes with your ${dayAnimal}: expect changes.`,
        points: points.clash,
      });
    }
    if (points.combine) {
      lines.push({
        text: `${animal} pairs up with your ${dayAnimal}: good for teamwork.`,
        points: points.combine,
      });
    }
    if (point.trine) {
      lines.push({
        text: `${animal} completes a team of three (三合) that turns into ${ELEMENT_NAMES[point.trine.element]}, ${feelingAbout(chart, point.trine.element)}.`,
        points: points.trine || 0,
      });
    }
    if (points.punishment) {
      lines.push({
        text: `${animal} completes a punishment (三刑): friction with rules and people.`,
        points: points.punishment,
      });
    }
    if (points.events) lines.push({ text: "Your events this year.", points: points.events });
    if (points.eventTheme) {
      lines.push({
        text: `Your events carry on into ${GROUP_NAMES[point.group]} years.`,
        points: points.eventTheme,
      });
    }
    if (points.eventRipple) {
      lines.push({
        text: "Your events ripple in through related elements.",
        points: points.eventRipple,
      });
    }
    if (points.tuned) {
      lines.push({ text: "Tuned by how similar past years went.", points: points.tuned });
    }

    const side = point.score >= 50 ? "above" : "below";
    let trend = "Steady.";
    if (point.change >= 5) trend = "Rising: go after what you want.";
    else if (point.change <= -5) trend = "Dipping: rest and plan.";
    return {
      lines,
      summary: `50 → ${point.score}, ${side} the middle. ${trend}`,
    };
  }

  return {
    ELEMENTS,
    ELEMENT_NAMES,
    STEM_ELEMENT,
    GROUP_NAMES,
    MIN_CALIBRATION_EVENTS,
    MIN_RECTIFY_EVENTS,
    HOUR_BRANCHES,
    EVENT_CATEGORIES,
    stemName,
    ganZhiName,
    relationTo,
    analyzeChart,
    ganZhiFavor,
    eventEffect,
    buildLifeCurve,
    calibrate,
    rectifyHour,
    hourLabel,
    eventTheme,
    adjustStrengthForEvents,
    followUpForecasts,
    describeCurveChange,
    trueSolarTime,
    buildPhases,
    predictYear,
    keyFutureYears,
    explainYear,
    elementFeeling,
  };
})();
