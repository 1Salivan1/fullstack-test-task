/**
 * Demo data for the N5Deal prototype.
 *
 * Goals:
 *  - every flow in the brief can be evaluated without creating anything first;
 *  - the awkward states are present on purpose (suspended seller, suspended
 *    listing, draft, price-on-request, anonymous buyer, half-filled mandate),
 *    because those are what break naive implementations;
 *  - re-runnable: everything is upserted on a stable natural key.
 */
import {
  AssetStatus,
  DealType,
  InvestorType,
  ModerationActionType,
  PrismaClient,
  Role,
  UserStatus,
  Visibility,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo1234";

type SellerSeed = {
  key: string;
  email: string;
  name: string;
  company: string;
  country: string;
  website: string;
  about: string;
  verified: boolean;
  status?: UserStatus;
};

type BuyerSeed = {
  key: string;
  email: string;
  name: string;
  company: string;
  country: string;
  investorType: InvestorType;
  thesis: string;
  sectors: string[];
  geographies: string[];
  dealTypes: DealType[];
  ticketMin: number | null;
  ticketMax: number | null;
  timeline: string;
  visibility?: Visibility;
  verified?: boolean;
};

type AssetSeed = {
  key: string;
  seller: string;
  title: string;
  summary: string;
  description: string;
  sector: string;
  jurisdiction: string;
  licenseType: string;
  dealType: DealType;
  askingPrice: number | null;
  revenue: number | null;
  ebitda: number | null;
  employees: number | null;
  foundedYear: number | null;
  highlights: string[];
  status?: AssetStatus;
  daysAgo?: number;
};

const SELLERS: SellerSeed[] = [
  {
    key: "seller",
    email: "seller@n5deal.demo",
    name: "Marek Novak",
    company: "Baltic Fintech Partners",
    country: "Lithuania",
    website: "https://baltic-fintech.example",
    about:
      "Boutique advisor for EMI and payment-institution exits in the Baltics. We represent owners, not funds.",
    verified: true,
  },
  {
    key: "lumen",
    email: "lumen@n5deal.demo",
    name: "Sofia Almeida",
    company: "Lumen Capital Advisory",
    country: "Portugal",
    website: "https://lumen-advisory.example",
    about: "Sell-side advisory for crypto and digital-asset businesses across the EU and UAE.",
    verified: true,
  },
  {
    key: "northgate",
    email: "northgate@n5deal.demo",
    name: "Daniel Fisher",
    company: "Northgate Holdings",
    country: "United Kingdom",
    website: "https://northgate.example",
    about: "Owner-operator divesting two regulated subsidiaries after a group restructuring.",
    verified: false,
  },
  {
    key: "helvetia",
    email: "helvetia@n5deal.demo",
    name: "Claudia Berger",
    company: "Helvetia Deal Office",
    country: "Switzerland",
    website: "https://helvetia-deals.example",
    about: "Wealth and brokerage assets in DACH and Liechtenstein.",
    verified: true,
  },
  {
    key: "ghost",
    email: "ghost@n5deal.demo",
    name: "Victor Sandu",
    company: "QuickLicense Brokers",
    country: "Cyprus",
    website: "https://quicklicense.example",
    about: "Fast licence sales, guaranteed approvals, no paperwork needed.",
    verified: false,
    status: UserStatus.SUSPENDED,
  },
];

const BUYERS: BuyerSeed[] = [
  {
    key: "buyer",
    email: "buyer@n5deal.demo",
    name: "Anna Kovalenko",
    company: "Meridian Payments Group",
    country: "Poland",
    investorType: InvestorType.STRATEGIC,
    thesis:
      "We consolidate profitable EU payment businesses onto our own processing platform. Priority: live EMI or PI licence, SEPA access, at least EUR 1M revenue and positive EBITDA. We can close in 90 days with cash on balance sheet.",
    sectors: ["Payments", "E-money / EMI"],
    geographies: ["Lithuania", "Poland", "Estonia", "Czech Republic"],
    dealTypes: [DealType.FULL_SALE, DealType.MAJORITY],
    ticketMin: 1_000_000,
    ticketMax: 6_000_000,
    timeline: "0-3 months",
    verified: true,
  },
  {
    key: "arcadia",
    email: "arcadia@n5deal.demo",
    name: "Thomas Lindqvist",
    company: "Arcadia Growth Partners",
    country: "Sweden",
    investorType: InvestorType.PRIVATE_EQUITY,
    thesis:
      "Buy-and-build in European wealth and investment technology. We take majority stakes in platforms with EUR 2-10M revenue, recurring fee income and a MiFID licence, and back the existing management team.",
    sectors: ["WealthTech", "SaaS & Platforms"],
    geographies: ["Germany", "Switzerland", "Netherlands", "United Kingdom"],
    dealTypes: [DealType.MAJORITY],
    ticketMin: 5_000_000,
    ticketMax: 25_000_000,
    timeline: "3-6 months",
    verified: true,
  },
  {
    key: "zenith",
    email: "zenith@n5deal.demo",
    name: "Rania Haddad",
    company: "Zenith Family Office",
    country: "UAE",
    investorType: InvestorType.FAMILY_OFFICE,
    thesis:
      "Diversifying into regulated digital assets. We look for VASP or MiCA-ready businesses with real custody infrastructure and a clean compliance record. Minority positions acceptable alongside a credible founder.",
    sectors: ["Crypto & Digital Assets"],
    geographies: ["UAE", "Switzerland", "Lithuania", "Singapore"],
    dealTypes: [DealType.MINORITY, DealType.MAJORITY],
    ticketMin: 2_000_000,
    ticketMax: 12_000_000,
    timeline: "3-6 months",
    visibility: Visibility.ANONYMOUS,
    verified: true,
  },
  {
    key: "foundry",
    email: "foundry@n5deal.demo",
    name: "Peter Dvorak",
    company: "Foundry Search",
    country: "Czech Republic",
    investorType: InvestorType.SEARCH_FUND,
    thesis:
      "First acquisition: a small, profitable regulated business in Central Europe that I will run myself. Owner-managed, under EUR 1.5M, founder willing to hand over operations within six months.",
    sectors: ["Lending", "Payments", "RegTech"],
    geographies: ["Czech Republic", "Poland", "Latvia", "Estonia"],
    dealTypes: [DealType.FULL_SALE],
    ticketMin: 300_000,
    ticketMax: 1_500_000,
    timeline: "6-12 months",
  },
  {
    key: "cobalt",
    email: "cobalt@n5deal.demo",
    name: "Isabelle Moreau",
    company: "Cobalt Insurance Ventures",
    country: "France",
    investorType: InvestorType.STRATEGIC,
    thesis:
      "We add distribution and underwriting technology to our insurance group. Interested in InsurTech and RegTech assets with EU customers, and in licence vehicles that shorten our time to market.",
    sectors: ["InsurTech", "RegTech"],
    geographies: ["France", "Germany", "Netherlands", "Ireland"],
    dealTypes: [DealType.FULL_SALE, DealType.ASSET_DEAL],
    ticketMin: 500_000,
    ticketMax: 4_000_000,
    timeline: "3-6 months",
  },
  {
    key: "harborline",
    email: "harborline@n5deal.demo",
    name: "Greg Dawson",
    company: "Harborline Capital",
    country: "United States",
    investorType: InvestorType.PRIVATE_EQUITY,
    thesis:
      "North American fund seeking a European beachhead. Any licensed payments or banking asset with a transferable licence and clean AML history; we bring compliance leadership and capital.",
    sectors: ["Payments", "Banking", "E-money / EMI", "FX & Brokerage"],
    geographies: ["Lithuania", "Malta", "Ireland", "United Kingdom", "Cyprus"],
    dealTypes: [DealType.MAJORITY, DealType.FULL_SALE],
    ticketMin: 3_000_000,
    ticketMax: 40_000_000,
    timeline: "Opportunistic",
    verified: true,
  },
  {
    key: "quanta",
    email: "quanta@n5deal.demo",
    name: "Yusuf Demir",
    company: "Quanta Brokerage",
    country: "Cyprus",
    investorType: InvestorType.STRATEGIC,
    thesis:
      "We acquire client books and licence vehicles in FX and CFD brokerage to expand our regulated footprint in the EU.",
    sectors: ["FX & Brokerage"],
    geographies: ["Cyprus", "Malta", "United Kingdom"],
    dealTypes: [DealType.ASSET_DEAL, DealType.FULL_SALE],
    ticketMin: 200_000,
    ticketMax: 2_500_000,
    timeline: "0-3 months",
  },
  {
    // Deliberately half-filled: exercises the "complete your mandate" nudge
    // and the empty-matches state.
    key: "newcomer",
    email: "newcomer@n5deal.demo",
    name: "Lucas Meyer",
    company: "Meyer Industries",
    country: "Germany",
    investorType: InvestorType.ANGEL,
    thesis: "Exploring the space.",
    sectors: [],
    geographies: [],
    dealTypes: [],
    ticketMin: null,
    ticketMax: null,
    timeline: "Opportunistic",
  },
];

const ASSETS: AssetSeed[] = [
  {
    key: "emi-lt-core",
    seller: "seller",
    title: "Lithuanian EMI with live SEPA and card issuing",
    summary: "Profitable EMI, 3 400 active business clients, SEPA Instant and BIN sponsorship in place.",
    description:
      "Electronic money institution licensed by the Bank of Lithuania in 2019, operating a B2B account and card-issuing proposition for SME clients across the EEA. Revenue is split roughly 60% FX margin, 30% account and card fees, 10% interest income. The platform is built in-house (Java/Kotlin) with a certified card processor integration; the team of 24 includes a full second-line compliance function and a local MLRO. The owners are exiting to focus on a separate venture and will support a six-month transition. Perimeter includes the licence, the technology, all client contracts and the brand.",
    sector: "E-money / EMI",
    jurisdiction: "Lithuania",
    licenseType: "EMI",
    dealType: DealType.FULL_SALE,
    askingPrice: 4_200_000,
    revenue: 3_100_000,
    ebitda: 820_000,
    employees: 24,
    foundedYear: 2019,
    highlights: [
      "Bank of Lithuania EMI licence, no open regulatory findings",
      "SEPA Instant via direct CENTROlink membership",
      "3 400 active business clients, 11% annual churn",
      "Positive EBITDA for 9 consecutive quarters",
    ],
    daysAgo: 3,
  },
  {
    key: "pi-pl-smb",
    seller: "seller",
    title: "Polish payment institution serving SME merchants",
    summary: "Small PI with 900 merchants, EUR 1.1M revenue, acquiring via two sponsor banks.",
    description:
      "Small payment institution registered with KNF, providing merchant collections and payouts for Polish e-commerce. Growing 20% year over year with a lean team of nine. The founder stays for 12 months if required. Reason for sale: the parent group is consolidating around its lending arm.",
    sector: "Payments",
    jurisdiction: "Poland",
    licenseType: "Small PI",
    dealType: DealType.MAJORITY,
    askingPrice: 1_800_000,
    revenue: 1_100_000,
    ebitda: 240_000,
    employees: 9,
    foundedYear: 2020,
    highlights: ["900 active merchants", "Two sponsor bank relationships", "20% YoY revenue growth"],
    daysAgo: 9,
  },
  {
    key: "crypto-lt-casp",
    seller: "lumen",
    title: "MiCA-ready CASP with institutional custody stack",
    summary: "Lithuanian crypto business mid-way through MiCA authorisation, EUR 2.4M revenue.",
    description:
      "Digital-asset exchange and custody provider operating since 2018 under the Lithuanian VASP regime, with a MiCA (CASP) application filed and the gap analysis complete. Institutional custody built on MPC infrastructure, 140 corporate clients and an OTC desk. Sale is driven by the need for regulatory capital that the current shareholders cannot provide.",
    sector: "Crypto & Digital Assets",
    jurisdiction: "Lithuania",
    licenseType: "MiCA (CASP)",
    dealType: DealType.MAJORITY,
    askingPrice: 7_500_000,
    revenue: 2_400_000,
    ebitda: 310_000,
    employees: 31,
    foundedYear: 2018,
    highlights: [
      "MiCA application filed, gap analysis closed",
      "MPC custody, SOC 2 Type II",
      "140 institutional clients, EUR 180M AUC",
    ],
    daysAgo: 5,
  },
  {
    key: "crypto-ae-otc",
    seller: "lumen",
    title: "Dubai OTC desk with VARA licence",
    summary: "Profitable OTC trading desk, USD 9M annual gross profit, VARA licensed.",
    description:
      "Over-the-counter digital asset desk serving family offices in the GCC. Fully licensed, 12 staff, banking relationships with two regional banks. Shareholders are selling a minority position to fund balance-sheet expansion.",
    sector: "Crypto & Digital Assets",
    jurisdiction: "UAE",
    licenseType: "VASP",
    dealType: DealType.MINORITY,
    askingPrice: 6_000_000,
    revenue: 9_000_000,
    ebitda: 3_400_000,
    employees: 12,
    foundedYear: 2021,
    highlights: ["VARA licence", "Two regional banking relationships", "38% EBITDA margin"],
    daysAgo: 14,
  },
  {
    key: "wealth-ch-platform",
    seller: "helvetia",
    title: "Swiss wealth management platform, CHF 1.2B AUM",
    summary: "Fee-based wealth manager with proprietary portfolio platform and 480 clients.",
    description:
      "FINMA-supervised asset manager with a proprietary rebalancing and reporting platform used by three external partners under white label. Revenue is 92% recurring management fees. The founding partners seek a majority investor to fund the next platform generation and will retain 25%.",
    sector: "WealthTech",
    jurisdiction: "Switzerland",
    licenseType: "MiFID investment firm",
    dealType: DealType.MAJORITY,
    askingPrice: 14_000_000,
    revenue: 6_800_000,
    ebitda: 2_100_000,
    employees: 38,
    foundedYear: 2011,
    highlights: ["CHF 1.2B AUM", "92% recurring revenue", "White-label platform used by 3 partners"],
    daysAgo: 20,
  },
  {
    key: "brokerage-cy-book",
    seller: "helvetia",
    title: "CySEC brokerage licence vehicle with client book",
    summary: "Clean CySEC entity, 4 100 retail accounts, sold as an asset deal.",
    description:
      "MiFID investment firm authorised by CySEC, currently operating at reduced volume. Includes the licence vehicle, the retail client book and the brand. No legacy litigation; last audit clean. Suitable for a buyer wanting an EU passport quickly.",
    sector: "FX & Brokerage",
    jurisdiction: "Cyprus",
    licenseType: "MiFID investment firm",
    dealType: DealType.ASSET_DEAL,
    askingPrice: 1_250_000,
    revenue: 740_000,
    ebitda: -120_000,
    employees: 6,
    foundedYear: 2015,
    highlights: ["CySEC licence, clean audit", "4 100 retail accounts", "EU passporting in 9 states"],
    daysAgo: 28,
  },
  {
    key: "lending-cz-consumer",
    seller: "northgate",
    title: "Czech consumer lender, EUR 18M loan book",
    summary: "Licensed consumer lender, 14% net yield, fully digital origination.",
    description:
      "Consumer lending business licensed by the Czech National Bank, originating through its own mobile app and three partner marketplaces. Loan book of EUR 18M with a 3.1% NPL ratio. The group is divesting to concentrate on its UK operations.",
    sector: "Lending",
    jurisdiction: "Czech Republic",
    licenseType: "Consumer lending licence",
    dealType: DealType.FULL_SALE,
    askingPrice: 5_400_000,
    revenue: 4_200_000,
    ebitda: 1_350_000,
    employees: 42,
    foundedYear: 2016,
    highlights: ["EUR 18M loan book, 3.1% NPL", "Fully digital origination", "14% net yield"],
    daysAgo: 11,
  },
  {
    key: "regtech-ie-kyc",
    seller: "northgate",
    title: "Irish KYC/AML automation vendor",
    summary: "B2B RegTech SaaS, EUR 2.2M ARR, 96% gross retention.",
    description:
      "Identity verification and transaction-monitoring platform sold to EU banks and payment institutions. 27 enterprise customers on multi-year contracts, ARR of EUR 2.2M growing 31% annually. Unregulated software business; no licence required.",
    sector: "RegTech",
    jurisdiction: "Ireland",
    licenseType: "Unregulated",
    dealType: DealType.FULL_SALE,
    askingPrice: 9_800_000,
    revenue: 2_200_000,
    ebitda: 440_000,
    employees: 29,
    foundedYear: 2017,
    highlights: ["EUR 2.2M ARR, +31% YoY", "27 enterprise customers", "96% gross retention"],
    daysAgo: 6,
  },
  {
    key: "insurtech-nl-mga",
    seller: "northgate",
    title: "Dutch MGA with embedded insurance distribution",
    summary: "Managing general agent, EUR 31M gross written premium, embedded in 40 partners.",
    description:
      "Managing general agent distributing travel and gadget cover through embedded partnerships with e-commerce platforms. Capacity provided by two A-rated carriers. Price on request as the shareholders are running a structured process.",
    sector: "InsurTech",
    jurisdiction: "Netherlands",
    licenseType: "Unregulated",
    dealType: DealType.MAJORITY,
    askingPrice: null,
    revenue: 5_600_000,
    ebitda: 980_000,
    employees: 34,
    foundedYear: 2018,
    highlights: ["EUR 31M GWP", "40 embedded distribution partners", "Two A-rated capacity providers"],
    daysAgo: 17,
  },
  {
    key: "emi-mt-dormant",
    seller: "seller",
    title: "Maltese EMI vehicle, dormant but in good standing",
    summary: "Clean EMI licence with no legacy clients — a shortcut to EU passporting.",
    description:
      "MFSA-authorised electronic money institution that paused commercial operations in 2023. Licence maintained, annual returns filed, no clients and no legacy liabilities. Suitable for a buyer who needs an EU licence faster than a de-novo application allows.",
    sector: "E-money / EMI",
    jurisdiction: "Malta",
    licenseType: "EMI",
    dealType: DealType.ASSET_DEAL,
    askingPrice: 950_000,
    revenue: 0,
    ebitda: -85_000,
    employees: 2,
    foundedYear: 2017,
    highlights: ["MFSA EMI licence in good standing", "No legacy clients or liabilities", "Filings up to date"],
    daysAgo: 24,
  },
  {
    key: "banking-de-small",
    seller: "helvetia",
    title: "German specialist bank, BaFin licensed",
    summary: "Deposit-taking bank with EUR 240M balance sheet, serving SME factoring clients.",
    description:
      "Full banking licence from BaFin, focused on receivables finance for Mittelstand companies. Stable deposit base, CET1 ratio of 16.4%. Shareholders seek a majority partner with banking experience. Detailed financials under NDA.",
    sector: "Banking",
    jurisdiction: "Germany",
    licenseType: "Banking licence",
    dealType: DealType.MAJORITY,
    askingPrice: 38_000_000,
    revenue: 21_000_000,
    ebitda: 6_700_000,
    employees: 96,
    foundedYear: 2008,
    highlights: ["BaFin banking licence", "EUR 240M balance sheet", "CET1 16.4%"],
    daysAgo: 33,
  },
  {
    key: "payments-ee-acquirer",
    seller: "seller",
    title: "Estonian payment institution for high-risk acquiring",
    summary: "PI with card acquiring for regulated gaming merchants, EUR 2.8M revenue.",
    description:
      "Payment institution licensed in Estonia providing acquiring and payout services to licensed gaming operators. Strong compliance function given the vertical, two sponsor banks and direct Visa/Mastercard membership. Owners want a strategic partner with greater processing capacity.",
    sector: "Payments",
    jurisdiction: "Estonia",
    licenseType: "Payment Institution (PI)",
    dealType: DealType.MAJORITY,
    askingPrice: 3_600_000,
    revenue: 2_800_000,
    ebitda: 710_000,
    employees: 18,
    foundedYear: 2019,
    highlights: ["Direct Visa and Mastercard membership", "Licensed-gaming vertical expertise", "25% EBITDA margin"],
    daysAgo: 8,
  },
  {
    key: "saas-pl-corebanking",
    seller: "northgate",
    title: "Core banking SaaS for credit unions",
    summary: "Modular core banking platform, 14 institutional clients in CEE.",
    description:
      "Cloud core banking and loan management platform used by credit unions and small banks in Poland, Romania and Bulgaria. Licence-plus-maintenance model migrating to subscription. Unregulated technology vendor.",
    sector: "SaaS & Platforms",
    jurisdiction: "Poland",
    licenseType: "Unregulated",
    dealType: DealType.FULL_SALE,
    askingPrice: 4_900_000,
    revenue: 3_300_000,
    ebitda: 620_000,
    employees: 47,
    foundedYear: 2013,
    highlights: ["14 institutional clients", "Migrating to subscription pricing", "Deployed in 3 countries"],
    daysAgo: 21,
  },
  {
    key: "gaming-mt-operator",
    seller: "lumen",
    title: "Malta-licensed casino operator, two brands",
    summary: "MGA B2C operator, EUR 12M gross gaming revenue, 60 000 depositing players.",
    description:
      "Online casino operator with two consumer brands focused on Nordic markets. MGA licence plus a Swedish national licence. Sale includes player databases, brands and the technology stack licensed from a third-party platform.",
    sector: "Gaming & Betting",
    jurisdiction: "Malta",
    licenseType: "Gaming licence",
    dealType: DealType.FULL_SALE,
    askingPrice: 11_000_000,
    revenue: 12_000_000,
    ebitda: 2_600_000,
    employees: 54,
    foundedYear: 2016,
    highlights: ["MGA and Swedish licences", "60 000 depositing players", "Two established brands"],
    daysAgo: 30,
  },
  {
    key: "fx-uk-ib",
    seller: "northgate",
    title: "UK FCA-authorised FX payments business",
    summary: "Corporate FX broker, GBP 2.1M revenue, 1 300 corporate clients.",
    description:
      "FCA-authorised payment institution offering spot and forward FX to UK SMEs. Hedging line with a tier-one bank. The group is exiting non-core activities. Management stays.",
    sector: "FX & Brokerage",
    jurisdiction: "United Kingdom",
    licenseType: "Payment Institution (PI)",
    dealType: DealType.FULL_SALE,
    askingPrice: 3_200_000,
    revenue: 2_450_000,
    ebitda: 690_000,
    employees: 21,
    foundedYear: 2014,
    highlights: ["FCA authorised", "1 300 corporate clients", "Tier-one hedging line"],
    daysAgo: 16,
  },
  {
    key: "lending-lv-bnpl",
    seller: "seller",
    title: "Latvian BNPL provider with retail integrations",
    summary: "Point-of-sale finance, EUR 6M originations per year, 70 retail partners.",
    description:
      "Buy-now-pay-later provider integrated with 70 retailers in Latvia and Lithuania. Licensed consumer lender, funded by a mix of equity and a EUR 4M credit facility. Founder is relocating and will exit fully.",
    sector: "Lending",
    jurisdiction: "Latvia",
    licenseType: "Consumer lending licence",
    dealType: DealType.FULL_SALE,
    askingPrice: 1_400_000,
    revenue: 980_000,
    ebitda: 155_000,
    employees: 11,
    foundedYear: 2020,
    highlights: ["70 retail integrations", "EUR 6M annual originations", "EUR 4M credit facility in place"],
    daysAgo: 4,
  },
  {
    key: "wealth-de-roboadvisor",
    seller: "helvetia",
    title: "German robo-advisor with BaFin-licensed operator",
    summary: "Digital wealth platform, EUR 320M AUM, 14 000 retail clients.",
    description:
      "Robo-advisory platform with its own licensed operating entity. Fee income of 0.75% on AUM. Looking for a majority investor to fund customer acquisition; founders retain 30% and continue to run the business.",
    sector: "WealthTech",
    jurisdiction: "Germany",
    licenseType: "MiFID investment firm",
    dealType: DealType.MAJORITY,
    askingPrice: 8_200_000,
    revenue: 2_600_000,
    ebitda: 180_000,
    employees: 26,
    foundedYear: 2017,
    highlights: ["EUR 320M AUM", "14 000 retail clients", "Own BaFin-licensed operator"],
    daysAgo: 12,
  },
  {
    key: "insurtech-fr-broker",
    seller: "lumen",
    title: "French digital insurance broker",
    summary: "Online broker for SME liability cover, EUR 1.9M commission revenue.",
    description:
      "Digital-first insurance brokerage with a proprietary quote-and-bind engine for professional liability. ORIAS registered. Reason for sale: the founders are starting a carrier-side venture.",
    sector: "InsurTech",
    jurisdiction: "France",
    licenseType: "Unregulated",
    dealType: DealType.FULL_SALE,
    askingPrice: 2_300_000,
    revenue: 1_900_000,
    ebitda: 430_000,
    employees: 16,
    foundedYear: 2019,
    highlights: ["ORIAS registered", "Proprietary quote-and-bind engine", "23% EBITDA margin"],
    daysAgo: 19,
  },
  {
    key: "regtech-sg-monitor",
    seller: "lumen",
    title: "Singapore transaction monitoring vendor",
    summary: "AML monitoring SaaS for APAC payment firms, USD 1.4M ARR.",
    description:
      "Transaction monitoring and sanctions screening platform serving payment institutions in Singapore, Hong Kong and Australia. Founder-led, profitable, seeking a strategic acquirer with EU distribution.",
    sector: "RegTech",
    jurisdiction: "Singapore",
    licenseType: "Unregulated",
    dealType: DealType.FULL_SALE,
    askingPrice: 5_100_000,
    revenue: 1_400_000,
    ebitda: 390_000,
    employees: 19,
    foundedYear: 2018,
    highlights: ["USD 1.4M ARR", "Clients in 3 APAC markets", "Profitable, founder-led"],
    daysAgo: 26,
  },
  {
    key: "payments-nl-psp",
    seller: "helvetia",
    title: "Dutch PSP with marketplace payouts specialism",
    summary: "Payment service provider for marketplaces, EUR 4.1M revenue, DNB licensed.",
    description:
      "Payment service provider authorised by DNB, specialising in split payments and payouts for online marketplaces. Processing EUR 900M annually. The shareholder group is seeking full exit.",
    sector: "Payments",
    jurisdiction: "Netherlands",
    licenseType: "Payment Institution (PI)",
    dealType: DealType.FULL_SALE,
    askingPrice: 12_500_000,
    revenue: 4_100_000,
    ebitda: 1_150_000,
    employees: 33,
    foundedYear: 2015,
    highlights: ["DNB authorised", "EUR 900M annual processing volume", "Marketplace split-payment engine"],
    daysAgo: 22,
  },
  {
    key: "crypto-ch-custody",
    seller: "helvetia",
    title: "Swiss digital asset custodian",
    summary: "FINMA-supervised custodian, CHF 410M assets under custody.",
    description:
      "Institutional custody provider with FINMA supervision and insurance coverage on cold storage. Revenue from custody fees and staking. Minority stake offered to a strategic partner.",
    sector: "Crypto & Digital Assets",
    jurisdiction: "Switzerland",
    licenseType: "VASP",
    dealType: DealType.MINORITY,
    askingPrice: 9_000_000,
    revenue: 3_400_000,
    ebitda: 900_000,
    employees: 22,
    foundedYear: 2019,
    highlights: ["FINMA supervised", "CHF 410M assets under custody", "Insured cold storage"],
    daysAgo: 27,
  },
  {
    key: "payments-lt-draft",
    seller: "seller",
    title: "Vilnius-based payout specialist (draft)",
    summary: "Draft listing — financials still being prepared.",
    description: "Early draft. Data room is being assembled.",
    sector: "Payments",
    jurisdiction: "Lithuania",
    licenseType: "",
    dealType: DealType.FULL_SALE,
    askingPrice: null,
    revenue: null,
    ebitda: null,
    employees: null,
    foundedYear: null,
    highlights: [],
    status: AssetStatus.DRAFT,
    daysAgo: 1,
  },
  {
    key: "lending-ro-archived",
    seller: "northgate",
    title: "Polish microfinance portfolio",
    summary: "Sold in Q1 — kept for reference.",
    description:
      "Microfinance loan portfolio of EUR 3M in Poland. Transaction completed; the listing is archived rather than deleted so the conversation history stays intact.",
    sector: "Lending",
    jurisdiction: "Poland",
    licenseType: "Consumer lending licence",
    dealType: DealType.ASSET_DEAL,
    askingPrice: 2_000_000,
    revenue: 1_200_000,
    ebitda: 300_000,
    employees: 8,
    foundedYear: 2017,
    highlights: ["Transaction completed"],
    status: AssetStatus.ARCHIVED,
    daysAgo: 90,
  },
  {
    key: "emi-cy-suspicious",
    seller: "ghost",
    title: "EMI licence — instant approval, no questions",
    summary: "Guaranteed licence transfer in 10 days, cash only, no due diligence needed.",
    description:
      "Licence transfer with guaranteed regulator approval. No KYC on the buyer, no due diligence, payment in cash or crypto only.",
    sector: "E-money / EMI",
    jurisdiction: "Cyprus",
    licenseType: "EMI",
    dealType: DealType.ASSET_DEAL,
    askingPrice: 150_000,
    revenue: null,
    ebitda: null,
    employees: null,
    foundedYear: null,
    highlights: ["No due diligence", "Cash or crypto"],
    status: AssetStatus.SUSPENDED,
    daysAgo: 13,
  },
];

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userIds = new Map<string, string>();

  const manager = await db.user.upsert({
    where: { email: "manager@n5deal.demo" },
    update: { name: "Olena Shevchenko", role: Role.MANAGER, status: UserStatus.ACTIVE, passwordHash },
    create: {
      email: "manager@n5deal.demo",
      name: "Olena Shevchenko",
      role: Role.MANAGER,
      passwordHash,
    },
  });
  userIds.set("manager", manager.id);

  for (const seed of SELLERS) {
    const user = await db.user.upsert({
      where: { email: seed.email },
      update: { name: seed.name, role: Role.SELLER, status: seed.status ?? UserStatus.ACTIVE, passwordHash },
      create: {
        email: seed.email,
        name: seed.name,
        role: Role.SELLER,
        status: seed.status ?? UserStatus.ACTIVE,
        passwordHash,
      },
    });
    userIds.set(seed.key, user.id);

    const profile = {
      companyName: seed.company,
      country: seed.country,
      website: seed.website,
      about: seed.about,
      verified: seed.verified,
    };
    await db.sellerProfile.upsert({
      where: { userId: user.id },
      update: profile,
      create: { userId: user.id, ...profile },
    });
  }

  for (const seed of BUYERS) {
    const user = await db.user.upsert({
      where: { email: seed.email },
      update: { name: seed.name, role: Role.BUYER, status: UserStatus.ACTIVE, passwordHash },
      create: { email: seed.email, name: seed.name, role: Role.BUYER, passwordHash },
    });
    userIds.set(seed.key, user.id);

    const profile = {
      companyName: seed.company,
      country: seed.country,
      investorType: seed.investorType,
      thesis: seed.thesis,
      sectors: seed.sectors,
      geographies: seed.geographies,
      dealTypes: seed.dealTypes,
      ticketMin: seed.ticketMin,
      ticketMax: seed.ticketMax,
      timeline: seed.timeline,
      visibility: seed.visibility ?? Visibility.PUBLIC,
      verified: seed.verified ?? false,
    };
    await db.buyerProfile.upsert({
      where: { userId: user.id },
      update: profile,
      create: { userId: user.id, ...profile },
    });
  }

  const assetIds = new Map<string, string>();
  for (const seed of ASSETS) {
    const sellerId = userIds.get(seed.seller);
    if (!sellerId) throw new Error(`Unknown seller key: ${seed.seller}`);
    const status = seed.status ?? AssetStatus.PUBLISHED;
    const createdAt = daysAgo(seed.daysAgo ?? 10);

    const data = {
      sellerId,
      title: seed.title,
      summary: seed.summary,
      description: seed.description,
      sector: seed.sector,
      jurisdiction: seed.jurisdiction,
      licenseType: seed.licenseType,
      dealType: seed.dealType,
      askingPrice: seed.askingPrice,
      currency: "EUR",
      revenue: seed.revenue,
      ebitda: seed.ebitda,
      employees: seed.employees,
      foundedYear: seed.foundedYear,
      highlights: seed.highlights,
      status,
      publishedAt: status === AssetStatus.DRAFT ? null : createdAt,
      createdAt,
    };

    // Natural key for idempotency: one listing title per seller.
    const existing = await db.asset.findFirst({ where: { sellerId, title: seed.title } });
    const asset = existing
      ? await db.asset.update({ where: { id: existing.id }, data })
      : await db.asset.create({ data });
    assetIds.set(seed.key, asset.id);
  }

  // --- Conversations -------------------------------------------------------
  const threads: Array<{
    assetKey: string;
    buyerKey: string;
    sellerKey: string;
    messages: Array<{ from: "buyer" | "seller"; body: string; hoursAgo: number; read?: boolean }>;
  }> = [
    {
      assetKey: "emi-lt-core",
      buyerKey: "buyer",
      sellerKey: "seller",
      messages: [
        {
          from: "buyer",
          hoursAgo: 52,
          read: true,
          body: "Hello Marek, Meridian Payments here. The EMI fits our mandate well. Three questions before we go further: revenue split by client segment, any open items with the Bank of Lithuania, and whether the card processor contract is assignable.",
        },
        {
          from: "seller",
          hoursAgo: 40,
          read: true,
          body: "Hi Anna. Revenue is 60% FX margin, 30% account and card fees, 10% interest. No open regulatory findings — last inspection closed in March. The processor contract is assignable with their consent, which they have given in writing for a change of control.",
        },
        {
          from: "buyer",
          hoursAgo: 6,
          body: "That is helpful. Can you share the last two years of audited financials and the client concentration table under NDA? We would like to put an indicative offer together this month.",
        },
      ],
    },
    {
      assetKey: "crypto-lt-casp",
      buyerKey: "zenith",
      sellerKey: "lumen",
      messages: [
        {
          from: "seller",
          hoursAgo: 70,
          read: true,
          body: "Hello, your mandate mentions MiCA-ready custody. Our Lithuanian CASP has the application filed and MPC custody live with EUR 180M under custody. Minority is possible alongside the founder.",
        },
        {
          from: "buyer",
          hoursAgo: 30,
          body: "Interesting. What is the expected authorisation timeline, and what regulatory capital is still required?",
        },
      ],
    },
    {
      assetKey: "lending-cz-consumer",
      buyerKey: "foundry",
      sellerKey: "northgate",
      messages: [
        {
          from: "buyer",
          hoursAgo: 96,
          read: true,
          body: "Hello Daniel, I am running a search fund and looking for an owner-managed business in Central Europe. The Czech lender is above my range, but is there any appetite for a carve-out of the smaller origination channel?",
        },
        {
          from: "seller",
          hoursAgo: 90,
          read: true,
          body: "Thanks for reaching out. We are selling the entity as a whole — a carve-out would not work for the licence. Happy to keep you posted if that changes.",
        },
      ],
    },
    {
      assetKey: "wealth-ch-platform",
      buyerKey: "arcadia",
      sellerKey: "helvetia",
      messages: [
        {
          from: "buyer",
          hoursAgo: 20,
          body: "Claudia, Arcadia Growth Partners. The Swiss platform matches our buy-and-build thesis. Are the founders open to a majority structure with a management rollover of 25%, and what is the current EBITDA bridge to the platform investment?",
        },
      ],
    },
  ];

  for (const thread of threads) {
    const assetId = assetIds.get(thread.assetKey)!;
    const buyerId = userIds.get(thread.buyerKey)!;
    const sellerId = userIds.get(thread.sellerKey)!;
    const lastMessageAt = new Date(
      Date.now() - Math.min(...thread.messages.map((m) => m.hoursAgo)) * 3600 * 1000,
    );

    const conversation = await db.conversation.upsert({
      where: { assetId_buyerId_sellerId: { assetId, buyerId, sellerId } },
      update: { lastMessageAt },
      create: { assetId, buyerId, sellerId, lastMessageAt },
    });

    await db.message.deleteMany({ where: { conversationId: conversation.id } });
    for (const message of thread.messages) {
      const createdAt = new Date(Date.now() - message.hoursAgo * 3600 * 1000);
      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: message.from === "buyer" ? buyerId : sellerId,
          body: message.body,
          createdAt,
          readAt: message.read ? createdAt : null,
        },
      });
    }
  }

  // --- Moderation log -----------------------------------------------------
  const ghostId = userIds.get("ghost")!;
  const ghostAssetId = assetIds.get("emi-cy-suspicious")!;

  await db.moderationAction.deleteMany({ where: { managerId: manager.id } });
  await db.moderationAction.createMany({
    data: [
      {
        managerId: manager.id,
        action: ModerationActionType.SUSPEND,
        reason:
          "Listing promises guaranteed regulatory approval and refuses buyer due diligence. Breaches platform listing standards.",
        targetAssetId: ghostAssetId,
        createdAt: daysAgo(12),
      },
      {
        managerId: manager.id,
        action: ModerationActionType.SUSPEND,
        reason:
          "Seller repeatedly published licence transfers with guaranteed-approval claims and declined identity verification.",
        targetUserId: ghostId,
        createdAt: daysAgo(12),
      },
    ],
  });

  const counts = {
    users: await db.user.count(),
    assets: await db.asset.count(),
    conversations: await db.conversation.count(),
    messages: await db.message.count(),
  };
  console.log("Seed complete:", counts);
  console.log(`Demo password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
