import fs from "fs/promises";
import path from "path";

const OUTPUT_DIR = "data";
const OUTPUT_FILE = "jobs.json";

function daysUntil(dateStr) {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function deriveStatus(lastDate) {
  const d = daysUntil(lastDate);
  if (d < 0) return "Expired";
  if (d <= 3) return "Closing Soon";
  return "Active";
}

async function fetchGovtJobs() {
  const jobs = [
    {
      id: "ntpc-mo-001",
      organization: "NTPC",
      title: "Medical Officer",
      sector: "PSU",
      state: "Telangana",
      location: "Ramagundam",
      salary: "₹60,000 - ₹1,80,000",
      lastDate: "2026-05-15",
      selectionMode: "Interview",
      verified: true,
      officialNotification: "https://careers.ntpc.co.in/",
      applyLink: "https://careers.ntpc.co.in/",
      source: "NTPC Official"
    }
  ];

  const normalizedJobs = jobs.map((job) => ({
    ...job,
    status: deriveStatus(job.lastDate),
    daysRemaining: daysUntil(job.lastDate)
  }));

  return {
    lastUpdated: new Date().toISOString(),
    statistics: {
      totalJobs: normalizedJobs.length,
      activeJobs: normalizedJobs.filter(j => j.status === "Active").length,
      closingSoon: normalizedJobs.filter(j => j.status === "Closing Soon").length,
      expiredJobs: normalizedJobs.filter(j => j.status === "Expired").length
    },
    jobs: normalizedJobs
  };
}

async function main() {
  const data = await fetchGovtJobs();

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(
    path.join(OUTPUT_DIR, OUTPUT_FILE),
    JSON.stringify(data, null, 2),
    "utf8"
  );

  console.log(`Updated ${OUTPUT_FILE} at ${data.lastUpdated}`);
}

main().catch((err) => {
  console.error("Refresh failed:", err);
  process.exit(1);
});
