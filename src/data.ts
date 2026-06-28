export type Outcome = {
  label: string;
  mult: string;
  pct: number;
  avatar?: string;
};

export type Market = {
  id: string;
  eyebrow: string;
  logo: string;
  logoColor: string;
  title: string;
  date?: string;
  outcomes: Outcome[];
  volume: string;
  markets: number;
  hasAvatars?: boolean;
};

export type Section = {
  title: string;
  markets: Market[];
};

export const corporateFinance: Section = {
  title: "Corporate Finance",
  markets: [
    {
      id: "rbnhd",
      eyebrow: "Robinhood Markets Inc.",
      logo: "H",
      logoColor: "#ccff00",
      title: "Robinhood funded customers in Q2",
      date: "Jul 29 @ 4:00PM",
      outcomes: [
        { label: "Above 28.1 million", mult: "2.89x", pct: 32 },
        { label: "Above 28 million", mult: "1.31x", pct: 75 },
      ],
      volume: "$165,222 vol",
      markets: 10,
    },
    {
      id: "nycorp",
      eyebrow: "Finance",
      logo: "$",
      logoColor: "#2f6df6",
      title: "How many new companies will register in New York in June?",
      outcomes: [
        { label: "At least 23500", mult: "1.67x", pct: 58 },
        { label: "At least 24000", mult: "2.98x", pct: 32 },
      ],
      volume: "$19,484 vol",
      markets: 5,
    },
    {
      id: "boeing",
      eyebrow: "Boeing Company (The)",
      logo: "B",
      logoColor: "#1b3a6b",
      title: "Boeing Deliveries in Q2",
      date: "Jul 8 @ 12:00AM",
      outcomes: [
        { label: "Above 160", mult: "2.14x", pct: 44 },
        { label: "Above 161", mult: "2.98x", pct: 33 },
      ],
      volume: "$28,740 vol",
      markets: 14,
    },
    {
      id: "googl",
      eyebrow: "Alphabet Inc.",
      logo: "G",
      logoColor: "#ea4335",
      title: "Google headcount in Q2",
      date: "Jul 22 @ 12:00AM",
      outcomes: [
        { label: "Above 196500", mult: "1.76x", pct: 55 },
        { label: "Above 196750", mult: "2.19x", pct: 44 },
      ],
      volume: "$17,835 vol",
      markets: 10,
    },
  ],
};

export type TrendItem = {
  q: string;
  sub: string;
  pct: number;
  change: number;
};

export const trendingList: TrendItem[] = [
  { q: "BTC price on Friday at 5pm EDT?", sub: "$59,500 or above", pct: 52, change: -10 },
  {
    q: "When will traffic at the Strait of Hormuz return to normal?",
    sub: "Before Oct 1, 2026",
    pct: 49,
    change: -16,
  },
  {
    q: "What will the announcers say during South Africa vs Canada",
    sub: "Champion",
    pct: 52,
    change: -7,
  },
];

export const primaries2026: TrendItem[] = [
  { q: "Colorado Democratic Governor nominee?", sub: "Phil Weiser", pct: 75, change: 8 },
  { q: "Florida Republican Governor nominee?", sub: "Byron Donalds", pct: 94, change: 2 },
];

/* ---------- Featured (Mentions) card ---------- */
export const featuredMarket = {
  eyebrow: "Mentions",
  page: 2,
  totalPages: 7,
  title: "What will the announcers say during South Africa vs Canada",
  rows: [
    { label: "Handball", mult: "1.57x", pct: 62 },
    { label: "Champion", mult: "1.79x", pct: 54 },
  ],
  volume: "$468,552 vol",
  more: 29,
  news: "South Africa and Canada meet in Los Angeles for their first ever FIFA World Cup knockout match, a milestone occasion for both nations according to ESPN. The Round of 32...",
  legend: [
    { label: "Handball", pct: 62, color: "#00b888" },
    { label: "Champion", pct: 54, color: "#2f6df6" },
    { label: "What a Save", pct: 43, color: "#f0a500" },
  ],
};

/* ---------- Elections page ---------- */
export const electionFilters = [
  "All markets",
  "US Elections",
  "Primaries",
  "2028",
  "Senate",
  "House",
  "Governor",
  "International elections",
  "Brazil",
  "Peru",
];

export const electionMarkets: Market[] = [
  {
    id: "dem-nominee",
    eyebrow: "2028",
    logo: "D",
    logoColor: "#2f6df6",
    title: "2028 Democratic presidential nominee",
    outcomes: [
      { label: "Gavin Newsom", mult: "3.96x", pct: 24, avatar: "GN" },
      { label: "Jon Ossoff", mult: "7.25x", pct: 13, avatar: "JO" },
    ],
    volume: "$138,268,838 vol",
    markets: 45,
    hasAvatars: true,
  },
  {
    id: "rep-nominee",
    eyebrow: "2028",
    logo: "R",
    logoColor: "#e5484d",
    title: "2028 Republican presidential nominee",
    outcomes: [
      { label: "J.D. Vance", mult: "2.29x", pct: 41, avatar: "JV" },
      { label: "Marco Rubio", mult: "3.18x", pct: 30, avatar: "MR" },
    ],
    volume: "$49,557,557 vol",
    markets: 38,
    hasAvatars: true,
  },
  {
    id: "pres-winner",
    eyebrow: "2028",
    logo: "US",
    logoColor: "#1b3a6b",
    title: "2028 U.S. Presidential Election winner?",
    outcomes: [
      { label: "Marco Rubio", mult: "4.73x", pct: 20, avatar: "MR" },
      { label: "J.D. Vance", mult: "4.98x", pct: 19, avatar: "JV" },
    ],
    volume: "$47,251,846 vol",
    markets: 30,
    hasAvatars: true,
  },
  {
    id: "co-gov",
    eyebrow: "Primaries",
    logo: "CO",
    logoColor: "#7a8a99",
    title: "Colorado Democratic Governor nominee?",
    date: "Jun 30 @ 8:00AM",
    outcomes: [
      { label: "Phil Weiser", mult: "1.33x", pct: 74, avatar: "PW" },
      { label: "Michael Bennet", mult: "3.52x", pct: 27, avatar: "MB" },
    ],
    volume: "$549,917 vol",
    markets: 3,
    hasAvatars: true,
  },
  {
    id: "fl-gov",
    eyebrow: "Governor",
    logo: "FL",
    logoColor: "#e5484d",
    title: "Florida Republican Governor nominee?",
    date: "Aug 18 @ 8:00AM",
    outcomes: [
      { label: "Byron Donalds", mult: "1.06x", pct: 94, avatar: "BD" },
      { label: "Paul Renner", mult: "12.5x", pct: 8, avatar: "PR" },
    ],
    volume: "$2,104,556 vol",
    markets: 6,
    hasAvatars: true,
  },
  {
    id: "co-01",
    eyebrow: "Primaries",
    logo: "CO",
    logoColor: "#2f6df6",
    title: "CO-01 Democratic nominee?",
    date: "Jun 30 @ 8:00AM",
    outcomes: [
      { label: "Diana DeGette", mult: "1.12x", pct: 89, avatar: "DD" },
      { label: "Yadira Caraveo", mult: "9.1x", pct: 11, avatar: "YC" },
    ],
    volume: "$312,889 vol",
    markets: 4,
    hasAvatars: true,
  },
];
