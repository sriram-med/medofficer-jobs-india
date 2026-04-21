const tierOneSources = [
  {
    organization: "NTPC",
    sector: "PSU",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://careers.ntpc.co.in/",
    extractionTargets: ["notification_pdf", "apply_page", "medical_keywords"]
  },
  {
    organization: "NPCIL",
    sector: "PSU",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://npcilcareers.co.in/MainSiten/DefaultInfo.aspx",
    extractionTargets: ["notification_pdf", "apply_page", "medical_keywords"]
  },
  {
    organization: "BEL",
    sector: "PSU",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://bel-india.in/job-notifications/",
    extractionTargets: ["notification_pdf", "apply_page", "medical_keywords"]
  },
  {
    organization: "BHEL",
    sector: "PSU",
    regionBias: "Telangana",
    priority: 1,
    careersUrl: "https://careers.bhel.in/",
    extractionTargets: ["notification_pdf", "apply_page", "medical_keywords"]
  },
  {
    organization: "ONGC",
    sector: "PSU",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://ongcindia.com/web/eng/career/recruitment-notice",
    extractionTargets: ["notification_pdf", "walkin_notice", "medical_keywords"]
  },
  {
    organization: "IOCL",
    sector: "PSU",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://iocl.com/latest-job-opening",
    extractionTargets: ["notification_pdf", "apply_page", "medical_keywords"]
  },
  {
    organization: "BPCL",
    sector: "PSU",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://www.bharatpetroleum.in/careers/job-openings.aspx",
    extractionTargets: ["notification_pdf", "apply_page", "medical_keywords"]
  },
  {
    organization: "HPCL",
    sector: "PSU",
    regionBias: "Andhra Pradesh",
    priority: 1,
    careersUrl: "https://www.hindustanpetroleum.com/hpcareers/current_openings",
    extractionTargets: ["notification_pdf", "apply_page", "medical_keywords"]
  },
  {
    organization: "SAIL",
    sector: "PSU",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://www.sail.co.in/en/home",
    extractionTargets: ["notification_pdf", "apply_page", "medical_keywords"]
  },
  {
    organization: "Coal India",
    sector: "PSU",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://www.coalindia.in/career-cil/jobs-at-coal-india/",
    extractionTargets: ["notification_pdf", "apply_page", "medical_keywords"]
  },
  {
    organization: "ECL",
    sector: "PSU",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://easterncoal.nic.in/",
    extractionTargets: ["notification_pdf", "apply_page", "medical_keywords"]
  },
  {
    organization: "GAIL",
    sector: "PSU",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://gailonline.com/CRCurrentSCform.html",
    extractionTargets: ["notification_pdf", "apply_page", "medical_keywords"]
  },
  {
    organization: "HAL",
    sector: "PSU",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://hal-india.co.in/Career_Detail.aspx?Mkey=221&lKey=&CKey=54",
    extractionTargets: ["notification_pdf", "apply_page", "medical_keywords"]
  },
  {
    organization: "Indian Railways",
    sector: "Govt",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://indianrailways.gov.in/",
    extractionTargets: ["notification_pdf", "walkin_notice", "medical_keywords"]
  },
  {
    organization: "ESIC",
    sector: "Govt",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://www.esic.gov.in/recruitments",
    extractionTargets: ["notification_pdf", "apply_page", "medical_keywords"]
  },
  {
    organization: "AIIMS",
    sector: "Govt",
    regionBias: "All India",
    priority: 1,
    careersUrl: "https://aiimsexams.ac.in/info/",
    extractionTargets: ["notification_pdf", "institute_notice", "medical_keywords"]
  },
  {
    organization: "HMFW Andhra Pradesh",
    sector: "Govt",
    regionBias: "Andhra Pradesh",
    priority: 1,
    careersUrl: "https://hmfw.ap.gov.in/",
    extractionTargets: ["notification_pdf", "district_notice", "medical_keywords"]
  },
  {
    organization: "Telangana Health",
    sector: "Govt",
    regionBias: "Telangana",
    priority: 1,
    careersUrl: "https://health.telangana.gov.in/",
    extractionTargets: ["notification_pdf", "district_notice", "medical_keywords"]
  },
  {
    organization: "DME Telangana",
    sector: "Govt",
    regionBias: "Telangana",
    priority: 1,
    careersUrl: "https://dme.telangana.gov.in/",
    extractionTargets: ["notification_pdf", "institute_notice", "medical_keywords"]
  }
];

module.exports = {
  tierOneSources
};
