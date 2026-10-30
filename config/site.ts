export const siteConfig = {
  name: "DesignGrade",
  fullName: "DesignGrade Studio",
  description:
    "Platform kurasi, pengumpulan tugas desain UI/UX, dan evaluasi berbasis rubrik terstruktur.",
  branding: {
    accentHex: "#1E3A5F", // Nordic Slate Blue
    inkHex: "#141413",    // Deep Charcoal
    paperHex: "#F7F6F2",  // Warm Alabaster
    tagline: "Structured UI/UX Critique & Assessment Workspace",
  },
  routes: {
    login: "/login",
    register: "/register",
    studentDashboard: "/student",
    teacherDashboard: "/teacher",
    adminDashboard: "/admin",
    profile: "/profile",
  },
} as const;

export type SiteConfig = typeof siteConfig;