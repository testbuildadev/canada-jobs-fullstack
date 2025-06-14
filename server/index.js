const express     = require('express');
const axios       = require('axios');
const cheerio     = require('cheerio');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const { URL }     = require('url');

const app     = express();
const PORT    = process.env.PORT || 5001;
const TIMEOUT = 10000; // ms

// ── Middleware ─────────────────────────────────────────────────────────
app.use(helmet());                        // Security headers
app.use(compression());                   // Gzip compression
app.use(express.json());                  // JSON body parsing
app.use(rateLimit({ windowMs: 15*60*1000, max: 100 })); // Rate limiting
app.use(cors({
  origin: [
    'https://tubular-kringle-5a9b7a.netlify.app', // your Netlify URL
    'https://canada-jobs-ui.netlify.app',          // optional custom UI domain
    'http://localhost:3000'                        // local development
  ]
}));

// ── Company Configuration ────────────────────────────────────────────────
const COMPANIES = [
  { name: "Notion",    lever_slug: "notion" },
  { name: "Figma",     lever_slug: "figma" },
  { name: "Pinterest", gh_slug:    "pinterest" },
  { name: "Airtable",  gh_slug:    "airtable" },
  { name: "Apple",     url: "https://jobs.apple.com/en-us/search?location=Canada" },
  { name: "Meta",      url: "https://www.metacareers.com/jobs?location=Canada" },
  { name: "Google",    url: "https://careers.google.com/jobs/results/?location=Canada" },
  { name: "Airbnb",    url: "https://careers.airbnb.com/positions/?locations=Canada" },
  { name: "OpenAI",    url: "https://openai.com/careers/" },
  { name: "Anthropic", url: "https://www.anthropic.com/careers" },
  { name: "Databricks",url: "https://databricks.com/company/careers/open-positions?region=Canada" },
  { name: "Snowflake", url: "https://careers.snowflake.com/" },
  { name: "LinkedIn",  url: "https://www.linkedin.com/company/linkedin/jobs/" },
  { name: "Uber",      url: "https://www.uber.com/global/en/careers/list/?location=Canada" },
  { name: "Grammarly", url: "https://www.grammarly.com/careers" },
  { name: "Snap",      url: "https://snap.com/en-US/jobs" },
  { name: "Roblox",    url: "https://corp.roblox.com/careers/" },
  { name: "Stripe",    url: "https://stripe.com/jobs" },
  { name: "Two Sigma", url: "https://www.twosigma.com/careers" },
  { name: "HRT",       url: "https://www.hudsonrivertrading.com/careers" },
  { name: "Plaid",     url: "https://plaid.com/careers/" },
  { name: "ByteDance", url: "https://jobs.bytedance.com/" },
  { name: "Cruise",    url: "https://getcruise.com/careers" },
  { name: "Netflix",   url: "https://jobs.netflix.com/" },
  { name: "Twitter",   url: "https://careers.twitter.com/" },
  { name: "Rippling",  url: "https://www.rippling.com/careers" },
  { name: "Twitch",    url: "https://www.twitch.tv/jobs" },
  { name: "Brex",      url: "https://brex.com/careers" }
];

// ── Helper functions ─────────────────────────────────────────────────────
async function getLeverJobs(name, slug) {
  try {
    const { data } = await axios.get(
      `https://api.lever.co/v0/postings/${slug}?limit=200`,
      { timeout: TIMEOUT }
    );
    return data
      .filter(p => {
        const loc = (p.categories?.location||"").toLowerCase();
        return loc.includes("canada") || loc.includes("usa");
      })
      .map(p => ({
        company:   name,
        title:     p.text.trim(),
        location:  p.categories.location.trim(),
        category:  p.categories.team || "Other",
        apply_url: p.applyUrl
      }));
  } catch (e) {
    console.warn(`⚠️ [${name}] Lever API error: ${e.message}`);
    return [];
  }
}

async function getGreenhouseJobs(name, slug) {
  try {
    const { data } = await axios.get(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
      { timeout: TIMEOUT }
    );
    return data.jobs
      .filter(j => {
        const loc = (j.location.name||"").toLowerCase();
        return loc.includes("canada") || loc.includes("usa");
      })
      .map(j => ({
        company:   name,
        title:     j.title.trim(),
        location:  j.location.name.trim(),
        category:  j.departments?.[0]?.name || "Other",
        apply_url: j.absolute_url
      }));
  } catch (e) {
    console.warn(`⚠️ [${name}] Greenhouse API error: ${e.message}`);
    return [];
  }
}

function parseGeneric(html, baseUrl, name) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const jobs = [];

  $("a[href]").each((_, el) => {
    const snippet = $(el).text().trim();
    const context = $(el).closest("li,div,tr").text();
    const txt     = (snippet + context).toLowerCase();
    if (!snippet || !(txt.includes("canada") || txt.includes("usa"))) return;

    const href = $(el).attr("href");
    const link = new URL(href, baseUrl).href;
    if (seen.has(link)) return;
    seen.add(link);

    const parts = snippet.split("–");
    jobs.push({
      company:   name,
      title:     parts[0].trim(),
      location:  (parts[1]||"").trim(),
      category:  "Other",
      apply_url: link
    });
  });

  return jobs;
}

async function getHtmlJobs(name, url) {
  try {
    const { data } = await axios.get(url, { timeout: TIMEOUT });
    return parseGeneric(data, url, name);
  } catch (e) {
    console.warn(`⚠️ [${name}] HTML fetch error: ${e.message}`);
    return [];
  }
}

// ── Aggregate & Serve ─────────────────────────────────────────────────────
app.get('/api/jobs', async (_, res) => {
  let all = [];
  for (let comp of COMPANIES) {
    let list = [];
    if (comp.lever_slug)   list = await getLeverJobs(comp.name, comp.lever_slug);
    else if (comp.gh_slug) list = await getGreenhouseJobs(comp.name, comp.gh_slug);
    else                   list = await getHtmlJobs(comp.name, comp.url);
    console.log(`→ [${comp.name}] found ${list.length}`);
    all = all.concat(list);
  }
  res.json(all);
});

app.listen(PORT, () =>
  console.log(`API listening on https://<YOUR-API-DOMAIN>/api/jobs`))