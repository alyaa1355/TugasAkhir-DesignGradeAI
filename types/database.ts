export type UserRole = "student" | "teacher" | "admin";

export type ClassMemberStatus = "active" | "inactive" | "removed";

export type AssignmentStatus = "draft" | "published" | "archived" | "closed";

export type DesignType =
  | "mobile_app_ui"
  | "web_dashboard_ui"
  | "wireframe"
  | "high_fidelity_mockup"
  | "design_system"
  | "prototype"
  | "ux_flow"
  | "other";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "processing"
  | "awaiting_teacher_review"
  | "revision_requested"
  | "graded"
  | "failed";

export type AssetType = "image" | "figma_link" | "supporting_screenshot";

export type AIAssessmentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "incomplete_evidence"
  | "failed";

export type TeacherReviewStatus =
  | "draft"
  | "revision_requested"
  | "finalized"
  | "published";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string;
  join_code: string;
  created_at: string;
  updated_at: string;
}