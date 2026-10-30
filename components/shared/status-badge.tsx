import {
  Clock,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  FileEdit,
  Lock,
  Send,
  Eye,
  XCircle,
} from "lucide-react";
import type { AssignmentStatus, SubmissionStatus } from "@/types/database";

export type StudentAssignmentViewState =
  | "available"
  | "in_progress"
  | "submitted"
  | "ai_processing"
  | "awaiting_teacher_review"
  | "revision_requested"
  | "graded"
  | "closed";

const viewStateConfig: Record<
  StudentAssignmentViewState,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  available: {
    label: "Tersedia",
    icon: Clock,
    className: "bg-[#EFECE6] text-[#141413] border-[#E5E2DC]",
  },
  in_progress: {
    label: "Draft Dikerjakan",
    icon: FileEdit,
    className: "bg-[#EBF0F5] text-[#1E3A5F] border-[#1E3A5F]/20",
  },
  submitted: {
    label: "Terkirim",
    icon: Send,
    className: "bg-[#EBF0F5] text-[#1E3A5F] border-[#1E3A5F]/25",
  },
  ai_processing: {
    label: "Analisis AI Berjalan",
    icon: Sparkles,
    className: "bg-[#FDF6EC] text-[#784916] border-[#784916]/25",
  },
  awaiting_teacher_review: {
    label: "Menunggu Review Guru",
    icon: Eye,
    className: "bg-[#FDF6EC] text-[#784916] border-[#784916]/25",
  },
  revision_requested: {
    label: "Perlu Revisi",
    icon: AlertTriangle,
    className: "bg-[#FBEFEF] text-[#8C2D2D] border-[#8C2D2D]/25",
  },
  graded: {
    label: "Nilai Diterbitkan",
    icon: CheckCircle2,
    className: "bg-[#EAF2EE] text-[#1F513F] border-[#1F513F]/25",
  },
  closed: {
    label: "Tugas Ditutup",
    icon: Lock,
    className: "bg-[#EFECE6] text-[#63615C] border-[#E5E2DC]",
  },
};

export function StudentWorkStatusBadge({
  state,
}: {
  state: StudentAssignmentViewState;
}) {
  const cfg = viewStateConfig[state];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 font-mono text-[11px] font-medium ${cfg.className}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
}

export function AssignmentLifecycleBadge({
  status,
}: {
  status: AssignmentStatus;
}) {
  const map: Record<
    AssignmentStatus,
    { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    draft: {
      label: "DRAFT",
      className: "bg-[#EFECE6] text-[#575551] border-[#E5E2DC]",
      icon: FileEdit,
    },
    published: {
      label: "PUBLISHED",
      className: "bg-[#EAF2EE] text-[#1F513F] border-[#1F513F]/25",
      icon: CheckCircle2,
    },
    archived: {
      label: "ARCHIVED",
      className: "bg-[#EFECE6] text-[#8A8884] border-[#E5E2DC]",
      icon: Lock,
    },
    closed: {
      label: "CLOSED",
      className: "bg-[#FBEFEF] text-[#8C2D2D] border-[#8C2D2D]/25",
      icon: XCircle,
    },
  };

  const item = map[status];
  const Icon = item.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider ${item.className}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{item.label}</span>
    </span>
  );
}

export function resolveStudentWorkState(
  assignmentStatus: AssignmentStatus,
  latestSubmissionStatus?: SubmissionStatus | null
): StudentAssignmentViewState {
  if (latestSubmissionStatus === "graded") return "graded";
  if (latestSubmissionStatus === "revision_requested") return "revision_requested";
  if (latestSubmissionStatus === "awaiting_teacher_review")
    return "awaiting_teacher_review";
  if (latestSubmissionStatus === "processing") return "ai_processing";
  if (latestSubmissionStatus === "submitted") return "submitted";
  if (latestSubmissionStatus === "draft") return "in_progress";
  if (assignmentStatus === "closed") return "closed";
  return "available";
}