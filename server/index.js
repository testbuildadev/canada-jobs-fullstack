// server/index.js
const express   = require('express');
const axios     = require('axios');
const cheerio   = require('cheerio');
const cors      = require('cors');
const { URL }   = require('url');

const app   = express();
const PORT  = process.env.PORT || 5001;
const TIMEOUT = 10000;  // ms

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------
// 1) Full list of companies, tagged with lever_slug, gh_slug or URL:
// ---------------------------------------------------------------------
const COMPANIES = [
  // Lever‑powered
  { name: "Notion",   lever_slug: "notion" },
  { name: "Figma",    lever_slug: "figma" },
  // Greenhouse‑powered
  { name: "Pinterest", gh_slug: "pinterest" },
  { name: "Airtable",  gh_slug: "airtable" },
  // HTML fallback
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
  { name: "Brex",      url: "https://brex.com/careers" },
];

// ---------------------------------------------------------------------
// 2) Lever JSON API
// ---------------------------------------------------------------------
async function getLeverJobs(name, slug) {
  const url = `https://api.lever.co/v0/postings/${slug}?limit=200`;
  try {
    const { data } = await axios.get(url, { timeout: TIMEOUT });
    return data
      .filter(post => post.categories?.location?.toLowerCase().includes("canada"))
      .map(post => ({
        company:   name,
        title:     post.text.trim(),
        location:  post.categories.location.trim(),
        apply_url: post.applyUrl
      }));
  } catch (e) {
    console.warn(`⚠️ [${name}] Lever API failed: ${e.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------
// 3) Greenhouse JSON API
// ---------------------------------------------------------------------
async function getGreenhouseJobs(name, slug) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
  try {
    const { data } = await axios.get(url, { timeout: TIMEOUT });
    return data.jobs
      .filter(job => job.location.name.toLowerCase().includes("canada"))
      .map(job => ({
        company:   name,
        title:     job.title.trim(),
        location:  job.location.name.trim(),
        apply_url: job.absolute_url
      }));
  } catch (e) {
    console.warn(`⚠️ [${name}] Greenhouse API failed: ${e.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------
// 4) Generic HTML scrape fallback
// ---------------------------------------------------------------------
function parseGeneric(html, baseUrl, name) {
  const $ = cheerio.load(html);
  const jobs = [];

  $("a[href]").each((i, el) => {
    const snippet = $(el).text().trim();
    const context = $(el).closest("li,div,tr").text();
    if (!snippet) return;
    if ((snippet + context).toLowerCase().includes("canada")) {
      const href = $(el).attr("href");
      const link = new URL(href, baseUrl).href;
      const parts = snippet.split("–");          // Title – Location
      jobs.push({
        company:   name,
        title:     parts[0].trim(),
        location:  (parts[1]||"").trim(),
        apply_url: link
      });
    }
  });

  // dedupe by URL
  const seen = {};
  return jobs.filter(j => {
    if (seen[j.apply_url]) return false;
    seen[j.apply_url] = true;
    return true;
  });
}

async function getHtmlJobs(name, url) {
  try {
    const { data } = await axios.get(url, { timeout: TIMEOUT });
    return parseGeneric(data, url, name);
  } catch (e) {
    console.warn(`⚠️ [${name}] HTML fetch failed: ${e.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------
// 5) Aggregate endpoint
// ---------------------------------------------------------------------
app.get("/api/jobs", async (req, res) => {
  let all = [];
  for (let comp of COMPANIES) {
    let list = [];
    if (comp.lever_slug) {
      list = await getLeverJobs(comp.name, comp.lever_slug);
    } else if (comp.gh_slug) {
      list = await getGreenhouseJobs(comp.name, comp.gh_slug);
    } else {
      list = await getHtmlJobs(comp.name, comp.url);
    }
    console.log(`→ [${comp.name}] found ${list.length} roles`);
    all = all.concat(list);
  }
  res.json(all);
});

// ---------------------------------------------------------------------
// 6) Start server
// ---------------------------------------------------------------------
app.listen(PORT, () =>
  console.log(`API listening on http://localhost:${PORT}/api/jobs`)
);
