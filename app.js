const jobs = (window.MEDOFFICER_JOBS || []).map((job) => {
  const lastDate = new Date(job.lastDate);
  const postedDate = new Date(job.postedDate);
  const lastChecked = new Date(job.lastChecked);
  const now = new Date("2025-04-21T09:00:00+05:30");
  const daysLeft = Math.ceil((lastDate - now) / (1000 * 60 * 60 * 24));

  return {
    ...job,
    lastDateObj: lastDate,
    postedDateObj: postedDate,
    lastCheckedObj: lastChecked,
    daysLeft,
    isActive: daysLeft >= 0,
    closingSoon: daysLeft >= 0 && daysLeft <= 10
  };
});

const stateFilter = document.querySelector("#stateFilter");
const orgFilter = document.querySelector("#orgFilter");
const sectorFilter = document.querySelector("#sectorFilter");
const modeFilter = document.querySelector("#modeFilter");
const salaryFilter = document.querySelector("#salaryFilter");
const statusFilter = document.querySelector("#statusFilter");
const searchInput = document.querySelector("#searchInput");
const quickFilters = document.querySelector("#quickFilters");
const resultsSummary = document.querySelector("#resultsSummary");
const activeCount = document.querySelector("#activeCount");
const verifiedCount = document.querySelector("#verifiedCount");
const sourceCount = document.querySelector("#sourceCount");

const featuredGrid = document.querySelector("#featuredGrid");
const psuGrid = document.querySelector("#psuGrid");
const closingGrid = document.querySelector("#closingGrid");
const latestGrid = document.querySelector("#latestGrid");

const quickChips = [
  "Telangana",
  "Andhra Pradesh",
  "All India",
  "PSU",
  "Govt",
  "Interview",
  "Closing Soon",
  "Verified Only"
];

const state = {
  query: "",
  quick: ""
};

function uniqueOptions(values) {
  return ["All", ...new Set(values.filter(Boolean))];
}

function populateSelect(element, values, label) {
  element.innerHTML = uniqueOptions(values)
    .map((value) => `<option value="${value}">${value === "All" ? `All ${label}` : value}</option>`)
    .join("");
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(dateValue));
}

function formatChecked(dateValue) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateValue));
}

function getStatusPill(job) {
  if (job.closingSoon) {
    return `<span class="pill closing">Closing in ${job.daysLeft}d</span>`;
  }

  if (job.isActive) {
    return `<span class="pill safe">Active</span>`;
  }

  return `<span class="pill">Expired</span>`;
}

function createJobCard(job) {
  const verifyClass = job.verified ? "verified" : "warning";
  const verifyText = job.verified ? "Verified official source" : "Watchlist source";

  return `
    <article class="job-card">
      <div class="job-head">
        <div>
          <span class="job-caption">${job.organization}</span>
          <h3>${job.title}</h3>
        </div>
        ${getStatusPill(job)}
      </div>

      <p class="job-caption">${job.summary}</p>

      <div class="badge-row">
        <span class="badge ${verifyClass}">${verifyText}</span>
        <span class="badge">${job.sourceName}</span>
      </div>

      <div class="job-meta">
        <div><strong>Location</strong>${job.location}</div>
        <div><strong>Salary</strong>${job.salary}</div>
        <div><strong>Last date</strong>${formatDate(job.lastDate)}</div>
        <div><strong>Qualification</strong>${job.qualification}</div>
        <div><strong>Vacancies</strong>${job.vacancies}</div>
        <div><strong>Selection</strong>${job.selectionMode}</div>
      </div>

      <div class="tag-row">
        ${job.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
      </div>

      <div class="job-footer">
        <span class="job-caption">Last checked ${formatChecked(job.lastChecked)} | ${job.sourceConfidence} confidence</span>
      </div>

      <div class="job-links">
        <a href="${job.officialNotification}" target="_blank" rel="noreferrer">Official notification</a>
        <a href="${job.applyLink}" target="_blank" rel="noreferrer">Apply / source page</a>
      </div>
    </article>
  `;
}

function createMiniCard(job) {
  return `
    <article class="mini-card">
      <div>
        <span class="job-caption">${job.organization}</span>
        <h3>${job.title}</h3>
      </div>
      <div class="tag-row">
        ${job.tags.slice(0, 3).map((tag) => `<span class="tag">${tag}</span>`).join("")}
      </div>
      <div class="mini-meta">
        <span>${job.location}</span>
        <span>${formatDate(job.lastDate)}</span>
      </div>
      <a href="${job.officialNotification}" target="_blank" rel="noreferrer">Open official source</a>
    </article>
  `;
}

function matchesQuickFilter(job) {
  switch (state.quick) {
    case "Telangana":
    case "Andhra Pradesh":
    case "All India":
      return job.state === state.quick;
    case "PSU":
    case "Govt":
      return job.sector === state.quick;
    case "Interview":
      return job.selectionMode === "Interview";
    case "Closing Soon":
      return job.closingSoon;
    case "Verified Only":
      return job.verified;
    default:
      return true;
  }
}

function applyFilters(inputJobs) {
  return inputJobs.filter((job) => {
    const query = state.query.trim().toLowerCase();
    const matchesQuery =
      !query ||
      [
        job.organization,
        job.title,
        job.location,
        job.state,
        job.sector,
        job.selectionMode,
        job.summary,
        ...job.tags
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

    const matchesState = stateFilter.value === "All" || job.state === stateFilter.value;
    const matchesOrg = orgFilter.value === "All" || job.organization === orgFilter.value;
    const matchesSector = sectorFilter.value === "All" || job.sector === sectorFilter.value;
    const matchesMode = modeFilter.value === "All" || job.selectionMode === modeFilter.value;
    const matchesSalary = salaryFilter.value === "All" || job.salaryBand === salaryFilter.value;
    const matchesStatus =
      statusFilter.value === "All" ||
      (statusFilter.value === "Active" && job.isActive) ||
      (statusFilter.value === "Closing Soon" && job.closingSoon) ||
      (statusFilter.value === "Verified" && job.verified);

    return (
      matchesQuery &&
      matchesState &&
      matchesOrg &&
      matchesSector &&
      matchesMode &&
      matchesSalary &&
      matchesStatus &&
      matchesQuickFilter(job)
    );
  });
}

function render() {
  const filteredJobs = applyFilters(jobs);
  const featuredJobs = filteredJobs.filter((job) => job.featured).slice(0, 9);
  const psuJobs = filteredJobs.filter((job) => job.sector === "PSU").slice(0, 8);
  const closingJobs = filteredJobs
    .filter((job) => job.closingSoon)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6);
  const latestJobs = filteredJobs
    .filter((job) => job.verified)
    .sort((a, b) => b.lastCheckedObj - a.lastCheckedObj)
    .slice(0, 6);

  featuredGrid.innerHTML = featuredJobs.map(createJobCard).join("") || `<p class="job-caption">No jobs match the current filters.</p>`;
  psuGrid.innerHTML = psuJobs.map(createMiniCard).join("") || `<p class="job-caption">No PSU jobs match the current filters.</p>`;
  closingGrid.innerHTML = closingJobs.map(createJobCard).join("") || `<p class="job-caption">No closing-soon jobs for the current filter set.</p>`;
  latestGrid.innerHTML = latestJobs.map(createJobCard).join("") || `<p class="job-caption">No verified jobs match the current filters.</p>`;

  activeCount.textContent = jobs.filter((job) => job.isActive).length;
  verifiedCount.textContent = jobs.filter((job) => job.verified).length;
  sourceCount.textContent = new Set(jobs.map((job) => job.organization)).size;
  resultsSummary.textContent = `${filteredJobs.length} curated listings across official-source-first channels`;
}

function bindEvents() {
  [stateFilter, orgFilter, sectorFilter, modeFilter, salaryFilter, statusFilter].forEach((element) => {
    element.addEventListener("change", render);
  });

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });

  quickFilters.addEventListener("click", (event) => {
    const button = event.target.closest(".chip");
    if (!button) {
      return;
    }

    const nextValue = button.dataset.value;
    state.quick = state.quick === nextValue ? "" : nextValue;

    [...quickFilters.querySelectorAll(".chip")].forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.value === state.quick);
    });

    render();
  });

  document.querySelectorAll(".region-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.quick = button.dataset.region;
      [...quickFilters.querySelectorAll(".chip")].forEach((chip) => {
        chip.classList.toggle("active", chip.dataset.value === state.quick);
      });
      render();
    });
  });

  document.querySelector("#searchForm").addEventListener("submit", (event) => event.preventDefault());
}

function init() {
  populateSelect(stateFilter, jobs.map((job) => job.state), "states");
  populateSelect(orgFilter, jobs.map((job) => job.organization), "organizations");
  populateSelect(sectorFilter, jobs.map((job) => job.sector), "sectors");
  populateSelect(modeFilter, jobs.map((job) => job.selectionMode), "selection modes");
  populateSelect(salaryFilter, jobs.map((job) => job.salaryBand), "salary bands");
  statusFilter.innerHTML = ["All", "Active", "Closing Soon", "Verified"]
    .map((value) => `<option value="${value}">${value === "All" ? "All statuses" : value}</option>`)
    .join("");

  quickFilters.innerHTML = quickChips
    .map((chip) => `<button class="chip" type="button" data-value="${chip}">${chip}</button>`)
    .join("");

  bindEvents();
  render();
}

init();
