"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  FolderKanban,
  Copy,
  Check,
  UserMinus,
  UserCheck,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { updateClassMemberStatusAction } from "@/features/classes/actions";
import { AssignmentLifecycleBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AssignmentStatus, ClassMemberStatus } from "@/types/database";

export interface ClassParticipantItem {
  memberId: string;
  studentId: string;
  fullName: string;
  joinedAt: string;
  status: ClassMemberStatus;
}

export interface ClassAssignmentSummary {
  id: string;
  title: string;
  designType: string;
  deadline: string;
  status: AssignmentStatus;
}

interface TeacherClassDetailCardProps {
  classItem: {
    id: string;
    name: string;
    description: string | null;
    joinCode: string;
    createdAt: string;
    participants: ClassParticipantItem[];
    assignments: ClassAssignmentSummary[];
  };
}

export function TeacherClassDetailCard({
  classItem,
}: TeacherClassDetailCardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"participants" | "assignments">(
    "participants"
  );
  const [searchStudent, setSearchStudent] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

  const activeParticipants = classItem.participants.filter(
    (p) => p.status === "active"
  );

  const filteredParticipants = classItem.participants.filter((p) =>
    p.fullName.toLowerCase().includes(searchStudent.trim().toLowerCase())
  );

  async function handleCopyCode() {
    await navigator.clipboard.writeText(classItem.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleToggleMemberStatus(
    memberId: string,
    currentStatus: ClassMemberStatus
  ) {
    setLoadingMemberId(memberId);
    const nextStatus = currentStatus === "active" ? "removed" : "active";
    await updateClassMemberStatusAction({
      memberId,
      classId: classItem.id,
      status: nextStatus,
    });
    setLoadingMemberId(null);
    router.refresh();
  }

  return (
    <div className="rounded-[8px] border border-[#E5E2DC] bg-white overflow-hidden shadow-[0_1px_2px_rgba(20,20,19,0.03)]">
      {/* Header Kelas & Kode Undangan */}
      <div className="p-5 border-b border-[#E5E2DC] bg-[#F7F6F2]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-[#141413]">
              {classItem.name}
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#1F513F] bg-[#EAF2EE] border border-[#1F513F]/20 px-2 py-0.5 rounded-[3px] tabular-nums">
              {activeParticipants.length} Siswa Aktif
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F] bg-[#EBF0F5] border border-[#1E3A5F]/20 px-2 py-0.5 rounded-[3px] tabular-nums">
              {classItem.assignments.length} Tugas Kelas
            </span>
          </div>
          {classItem.description && (
            <p className="text-xs text-[#575551]">{classItem.description}</p>
          )}
        </div>

        {/* Kotak Salin Kode Kelas */}
        <div className="flex items-center gap-2 self-start sm:self-center bg-white px-3 py-1.5 rounded-[6px] border border-[#E5E2DC]">
          <div>
            <span className="font-mono text-[9px] uppercase text-[#63615C] block leading-none">
              KODE UNDANGAN
            </span>
            <span className="font-mono text-xs font-semibold text-[#141413] tracking-wider">
              {classItem.joinCode}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyCode}
            className="h-7 px-2 text-xs text-[#1E3A5F] hover:bg-[#EBF0F5]"
            title="Salin kode kelas"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#1F513F]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigasi Tab: Partisipan Siswa vs Tugas di Kelas Ini */}
      <div className="px-5 pt-3 border-b border-[#E5E2DC] bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("participants")}
            className={`pb-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "participants"
                ? "border-[#1E3A5F] text-[#141413]"
                : "border-transparent text-[#63615C] hover:text-[#141413]"
            }`}
          >
            <Users className="h-3.5 w-3.5 text-[#1E3A5F]" />
            <span>
              Partisipan Siswa ({classItem.participants.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assignments")}
            className={`pb-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "assignments"
                ? "border-[#1E3A5F] text-[#141413]"
                : "border-transparent text-[#63615C] hover:text-[#141413]"
            }`}
          >
            <FolderKanban className="h-3.5 w-3.5 text-[#1E3A5F]" />
            <span>
              Tugas Khusus Kelas Ini ({classItem.assignments.length})
            </span>
          </button>
        </div>
      </div>

      {/* Isi Tab 1: Daftar Partisipan Siswa */}
      {activeTab === "participants" ? (
        <div className="p-5 space-y-4">
          {classItem.participants.length > 3 && (
            <div className="relative max-w-xs">
              <Search className="h-3.5 w-3.5 text-[#8A8884] absolute left-3 top-2.5" />
              <Input
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Cari nama siswa di kelas ini..."
                className="h-8 pl-8 bg-[#F7F6F2]/60 border-[#E5E2DC] text-xs"
              />
            </div>
          )}

          {filteredParticipants.length === 0 ? (
            <div className="py-6 text-center rounded-[6px] bg-[#F7F6F2]/50 border border-dashed border-[#E5E2DC] space-y-1">
              <p className="text-xs font-medium text-[#141413]">
                Belum ada siswa yang bergabung ke kelas {classItem.name}
              </p>
              <p className="text-[11px] text-[#63615C]">
                Bagikan kode undangan{" "}
                <strong className="font-mono text-[#141413]">
                  {classItem.joinCode}
                </strong>{" "}
                agar siswa dapat masuk ke kelas ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E2DC] font-mono text-[10px] uppercase text-[#63615C]">
                    <th className="py-2 pr-3 w-10">No</th>
                    <th className="py-2 px-3">Nama Lengkap Siswa</th>
                    <th className="py-2 px-3">Waktu Bergabung</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 pl-3 text-right">Aksi Guru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DC]/70">
                  {filteredParticipants.map((student, idx) => {
                    const isRemoved = student.status === "removed";
                    return (
                      <tr
                        key={student.memberId}
                        className="hover:bg-[#F7F6F2]/60 transition-colors"
                      >
                        <td className="py-2.5 pr-3 font-mono text-[11px] text-[#63615C] tabular-nums">
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#141413]">
                          {student.fullName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#63615C]">
                          {new Date(student.joinedAt).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {isRemoved ? (
                            <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-[3px] bg-[#FBEFEF] text-[#8C2D2D]">
                              Dikeluarkan
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-[3px] bg-[#EAF2EE] text-[#1F513F]">
                              Aktif
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={loadingMemberId === student.memberId}
                            onClick={() =>
                              handleToggleMemberStatus(
                                student.memberId,
                                student.status
                              )
                            }
                            className={`h-7 text-[11px] px-2.5 gap-1 ${
                              isRemoved
                                ? "bg-white border-[#1F513F]/30 text-[#1F513F] hover:bg-[#EAF2EE]"
                                : "bg-white border-[#E5E2DC] text-[#8C2D2D] hover:bg-[#FBEFEF]"
                            }`}
                          >
                            {isRemoved ? (
                              <>
                                <UserCheck className="h-3 w-3" />
                                Pulihkan
                              </>
                            ) : (
                              <>
                                <UserMinus className="h-3 w-3" />
                                Keluarkan
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Isi Tab 2: Daftar Tugas yang Terikat Spesifik pada Kelas Ini */
        <div className="p-5 space-y-3">
          {classItem.assignments.length === 0 ? (
            <div className="py-6 text-center rounded-[6px] bg-[#F7F6F2]/50 border border-dashed border-[#E5E2DC] space-y-2">
              <p className="text-xs text-[#575551]">
                Belum ada brief tugas yang ditetapkan untuk kelas{" "}
                <strong>{classItem.name}</strong>.
              </p>
              <Link href="/teacher/assignments/new" className="inline-block">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs bg-white border-[#E5E2DC]"
                >
                  Buat Tugas untuk Kelas Ini
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-2.5">
              {classItem.assignments.map((assign) => (
                <Link
                  key={assign.id}
                  href={`/teacher/assignments/${assign.id}`}
                  className="p-3.5 rounded-[6px] border border-[#E5E2DC] bg-[#F7F6F2]/50 hover:bg-white hover:border-[#1E3A5F]/40 transition-all flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#141413] flex items-center gap-1.5">
                      <span>{assign.title}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#1E3A5F]" />
                    </p>
                    <p className="font-mono text-[11px] text-[#63615C] mt-0.5">
                      Tenggat:{" "}
                      {new Date(assign.deadline).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <AssignmentLifecycleBadge status={assign.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}