import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CreatedStaffInviteResult,
  InviteValidityDays,
  StaffInvite,
  StaffInviteStatus,
  TeamMember,
} from '../../types';
import {
  formatTeamDate,
  formatTeamDateTime,
  getInviteStatus,
} from '../../utils/teamUtils';
import {
  UserPlus,
  Users,
  Shield,
  Trash2,
  Ticket,
  Copy,
  Check,
  AlertTriangle,
  MessageCircle,
  X,
  Clock,
  Ban,
  RefreshCw,
  Loader2,
  Mail,
  Calendar,
} from 'lucide-react';

const VALIDITY_OPTIONS: InviteValidityDays[] = [1, 3, 7, 30];

export const TeamManagementTab: React.FC = () => {
  const {
    user,
    userRole,
    restaurant,
    lang,
    teamMembers,
    teamInvites,
    isTeamLoading,
    teamError,
    loadTeamData,
    createStaffInvite,
    revokeStaffInvite,
    removeTeamMember,
    confirmAction,
    showToast,
  } = useApp();

  const isRtl = lang === 'ar';

  // Invite creation modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'staff' | 'admin'>('staff');
  const [inviteDays, setInviteDays] = useState<InviteValidityDays>(7);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteModalError, setInviteModalError] = useState<string | null>(null);

  // One-time code display dialog state (cleared on close)
  const [createdInvite, setCreatedInvite] = useState<CreatedStaffInviteResult | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Row-level loading states
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  useEffect(() => {
    if (userRole === 'admin') {
      loadTeamData();
    }
  }, [userRole, loadTeamData]);

  if (userRole !== 'admin') {
    return null;
  }

  const openCreateModal = () => {
    setInviteName('');
    setInviteRole('staff');
    setInviteDays(7);
    setInviteModalError(null);
    setIsInviteModalOpen(true);
  };

  const handleSubmitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteModalError(null);
    setIsCreatingInvite(true);

    const res = await createStaffInvite(inviteName.trim() || null, inviteRole, inviteDays);
    setIsCreatingInvite(false);

    if (!res.success || !res.invite) {
      setInviteModalError(
        res.error ||
          (lang === 'ar'
            ? 'تعذر إنشاء كود الدعوة. يرجى المحاولة مرة أخرى.'
            : lang === 'fr'
            ? "Impossible de créer le code d'invitation."
            : 'Could not create invitation code.')
      );
      return;
    }

    setIsInviteModalOpen(false);
    setCopiedCode(false);
    setCreatedInvite(res.invite);
  };

  const handleCopyCode = async () => {
    if (!createdInvite?.code) return;
    try {
      await navigator.clipboard.writeText(createdInvite.code);
      setCopiedCode(true);
      showToast(
        lang === 'ar'
          ? 'تم نسخ كود الدعوة!'
          : lang === 'fr'
          ? 'Code copié !'
          : 'Invitation code copied!'
      );
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      showToast(
        lang === 'ar'
          ? 'تعذر النسخ التلقائي، يرجى تحديد الكود ونسخه يدوياً.'
          : lang === 'fr'
          ? 'Copie automatique impossible, copiez le code manuellement.'
          : 'Could not copy automatically. Please copy the code manually.'
      );
    }
  };

  const handleCloseOneTimeDialog = () => {
    setCreatedInvite(null);
    setCopiedCode(false);
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (member.user_id === user?.id) return;

    const displayName = member.full_name || member.email || '';
    const confirmed = await confirmAction({
      variant: 'danger',
      title:
        lang === 'ar'
          ? 'إزالة عضو من الفريق'
          : lang === 'fr'
          ? "Retirer un membre de l'équipe"
          : 'Remove Team Member',
      message:
        lang === 'ar'
          ? `هل أنت متأكد من إزالة "${displayName}" من فريق المطعم؟ سيفقد صلاحية الوصول فوراً.`
          : lang === 'fr'
          ? `Voulez-vous vraiment retirer "${displayName}" de l'équipe ? Son accès sera immédiatement révoqué.`
          : `Are you sure you want to remove "${displayName}" from the restaurant team? They will immediately lose dashboard access.`,
      confirmLabel: lang === 'ar' ? 'إزالة' : lang === 'fr' ? 'Retirer' : 'Remove',
      cancelLabel: lang === 'ar' ? 'إلغاء' : lang === 'fr' ? 'Annuler' : 'Cancel',
    });

    if (!confirmed) return;

    setRemovingUserId(member.user_id);
    try {
      await removeTeamMember(member.user_id);
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleRevokeInvite = async (invite: StaffInvite) => {
    const label = invite.name || invite.full_name || invite.code_hint;
    const confirmed = await confirmAction({
      variant: 'danger',
      title:
        lang === 'ar'
          ? 'إلغاء كود الدعوة'
          : lang === 'fr'
          ? "Révoquer l'invitation"
          : 'Revoke Invitation',
      message:
        lang === 'ar'
          ? `هل تريد إلغاء كود الدعوة (${label})؟ لن يتمكن أحد من استخدامه بعد الآن.`
          : lang === 'fr'
          ? `Voulez-vous révoquer cette invitation (${label}) ? Ce code ne pourra plus être utilisé.`
          : `Revoke invitation (${label})? This code will no longer be accepted.`,
      confirmLabel: lang === 'ar' ? 'إلغاء الدعوة' : lang === 'fr' ? 'Révoquer' : 'Revoke',
      cancelLabel: lang === 'ar' ? 'تراجع' : lang === 'fr' ? 'Annuler' : 'Cancel',
    });

    if (!confirmed) return;

    setRevokingInviteId(invite.id);
    try {
      await revokeStaffInvite(invite.id);
    } finally {
      setRevokingInviteId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const isAdminRole = role === 'admin';
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide border ${
          isAdminRole
            ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30'
            : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
        }`}
      >
        <Shield className="w-3 h-3" />
        <span>
          {isAdminRole
            ? lang === 'ar'
              ? 'مدير'
              : lang === 'fr'
              ? 'Admin'
              : 'Admin'
            : lang === 'ar'
            ? 'طاقم عمل'
            : lang === 'fr'
            ? 'Équipe'
            : 'Staff'}
        </span>
      </span>
    );
  };

  const getStatusBadge = (status: StaffInviteStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            <span>{lang === 'ar' ? 'قيد الانتظار' : lang === 'fr' ? 'En attente' : 'Pending'}</span>
          </span>
        );
      case 'used':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <Check className="w-3 h-3" />
            <span>{lang === 'ar' ? 'مستخدم' : lang === 'fr' ? 'Utilisé' : 'Used'}</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700">
            <Clock className="w-3 h-3" />
            <span>{lang === 'ar' ? 'منتهي الصلاحية' : lang === 'fr' ? 'Expiré' : 'Expired'}</span>
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <Ban className="w-3 h-3" />
            <span>{lang === 'ar' ? 'ملغى' : lang === 'fr' ? 'Révoqué' : 'Revoked'}</span>
          </span>
        );
    }
  };

  const buildWhatsAppHref = (inv: CreatedStaffInviteResult) => {
    const siteUrl = `${window.location.origin}/?view=admin`;
    const restTitle = restaurant.name || 'MenuQR';
    const text =
      lang === 'ar'
        ? `مرحباً! تمت دعوتك للانضمام إلى فريق "${restTitle}".\n\nالرابط: ${siteUrl}\nكود الدعوة: ${inv.code}\n\nاضغط على "لدي كود دعوة" في شاشة الدخول ثم أدخل الكود.`
        : lang === 'fr'
        ? `Bonjour ! Vous êtes invité à rejoindre l'équipe de "${restTitle}".\n\nLien : ${siteUrl}\nCode d'invitation : ${inv.code}\n\nCliquez sur « J'ai un code d'invitation » puis saisissez le code.`
        : `Hello! You are invited to join the "${restTitle}" team.\n\nLink: ${siteUrl}\nInvitation code: ${inv.code}\n\nClick "I have an invitation code" on the login screen and enter the code.`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Action Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-[#FF5A1F] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base sm:text-lg text-stone-900 dark:text-stone-50">
              {lang === 'ar'
                ? 'إدارة الفريق والدعوات'
                : lang === 'fr'
                ? "Gestion de l'équipe & invitations"
                : 'Team Members & Invitations'}
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
              {lang === 'ar'
                ? 'قم بدعوة الموظفين أو المديرين عبر كود دعوة مؤقت وآمن بدون بريد إلكتروني'
                : lang === 'fr'
                ? 'Invitez vos collaborateurs avec un code sécurisé à usage unique'
                : 'Invite staff or co-admins with secure, single-use invitation codes'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => loadTeamData()}
            disabled={isTeamLoading}
            className="h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title={lang === 'ar' ? 'تحديث' : lang === 'fr' ? 'Actualiser' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${isTeamLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex-1 sm:flex-initial h-11 px-5 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {lang === 'ar'
                ? 'دعوة عضو جديد'
                : lang === 'fr'
                ? 'Inviter un membre'
                : 'Invite a member'}
            </span>
          </button>
        </div>
      </div>

      {/* Team Error Banner */}
      {teamError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-semibold">{teamError}</span>
          </div>
          <button
            type="button"
            onClick={() => loadTeamData()}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shrink-0 cursor-pointer"
          >
            {lang === 'ar' ? 'إعادة المحاولة' : lang === 'fr' ? 'Réessayer' : 'Retry'}
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TEAM MEMBERS LIST                                     */}
      {/* ======================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <h4 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>
              {lang === 'ar'
                ? 'أعضاء الفريق الحاليون'
                : lang === 'fr'
                ? "Membres de l'équipe"
                : 'Current Team Members'}
            </span>
          </h4>
          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200">
            {teamMembers.length}
          </span>
        </div>

        {isTeamLoading && teamMembers.length === 0 ? (
          <div className="space-y-3 py-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-stone-100 dark:bg-stone-800/70 animate-pulse"
              />
            ))}
          </div>
        ) : teamMembers.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-stone-300 py-6 text-center">
            {lang === 'ar'
              ? 'لا يوجد أعضاء في الفريق حالياً.'
              : lang === 'fr'
              ? "Aucun membre dans l'équipe pour le moment."
              : 'No team members found.'}
          </p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {teamMembers.map((member) => {
              const isSelf = member.user_id === user?.id;
              const isRemoving = removingUserId === member.user_id;

              return (
                <div
                  key={member.user_id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center font-black text-stone-700 dark:text-stone-200 shrink-0">
                      {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-stone-900 dark:text-stone-50 truncate">
                          {member.full_name || '—'}
                        </p>
                        {isSelf && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-200">
                            {lang === 'ar' ? 'أنت' : lang === 'fr' ? 'Vous' : 'You'}
                          </span>
                        )}
                        {getRoleBadge(member.role)}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-stone-600 dark:text-stone-300 mt-1">
                        {member.email && (
                          <span className="flex items-center gap-1 font-mono truncate">
                            <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-stone-400 shrink-0" />
                          <span>
                            {lang === 'ar'
                              ? 'انضم في '
                              : lang === 'fr'
                              ? 'Rejoint le '
                              : 'Joined '}
                            {formatTeamDate(member.created_at, lang)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member)}
                      disabled={isRemoving}
                      className="h-9 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/70 text-xs font-bold flex items-center justify-center gap-1.5 self-start sm:self-center shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isRemoving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>{lang === 'ar' ? 'إزالة' : lang === 'fr' ? 'Retirer' : 'Remove'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. INVITATIONS LIST (from staff_invites)                 */}
      {/* ======================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <h4 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#FF5A1F]" />
            <span>
              {lang === 'ar'
                ? 'سجل أكواد الدعوة'
                : lang === 'fr'
                ? 'Invitations envoyées'
                : 'Invitations'}
            </span>
          </h4>
          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200">
            {teamInvites.length}
          </span>
        </div>

        {isTeamLoading && teamInvites.length === 0 ? (
          <div className="space-y-3 py-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-14 rounded-2xl bg-stone-100 dark:bg-stone-800/70 animate-pulse"
              />
            ))}
          </div>
        ) : teamInvites.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <Ticket className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
            <p className="text-xs text-stone-500 dark:text-stone-300">
              {lang === 'ar'
                ? 'لم يتم إنشاء أي أكواد دعوة بعد. اضغط على "دعوة عضو جديد" للبدء.'
                : lang === 'fr'
                ? 'Aucune invitation créée pour le moment.'
                : 'No invitations created yet. Click "Invite a member" to generate one.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {teamInvites.map((invite) => {
              const status = getInviteStatus(invite);
              const isPending = status === 'pending';
              const isRevoking = revokingInviteId === invite.id;
              const inviteeName = invite.name || invite.full_name;

              return (
                <div
                  key={invite.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 dark:bg-stone-850/70 border border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        dir="ltr"
                        className="px-2.5 py-1 rounded-lg bg-stone-200/80 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono text-xs font-extrabold tracking-wider border border-stone-300 dark:border-stone-700"
                      >
                        {invite.code_hint || 'STF-…-XXXX'}
                      </span>
                      {getRoleBadge(invite.role)}
                      {getStatusBadge(status)}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-xs text-stone-600 dark:text-stone-300">
                      <span className="font-bold text-stone-800 dark:text-stone-100">
                        {inviteeName ||
                          (lang === 'ar'
                            ? 'دعوة بدون اسم محدد'
                            : lang === 'fr'
                            ? 'Invitation sans nom'
                            : 'Unnamed invite')}
                      </span>
                      <span className="text-stone-400">·</span>
                      <span className="text-[11px]">
                        {lang === 'ar'
                          ? 'تنتهي في: '
                          : lang === 'fr'
                          ? 'Expire le : '
                          : 'Expires: '}
                        {formatTeamDateTime(invite.expires_at, lang)}
                      </span>
                    </div>
                  </div>

                  {isPending && (
                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(invite)}
                      disabled={isRevoking}
                      className="h-9 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/70 text-xs font-bold flex items-center justify-center gap-1.5 self-start sm:self-center shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isRevoking ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Ban className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {lang === 'ar' ? 'إلغاء الدعوة' : lang === 'fr' ? 'Révoquer' : 'Revoke'}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. CREATE INVITE MODAL                                   */}
      {/* ======================================================== */}
      {isInviteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isCreatingInvite && setIsInviteModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 text-start space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-[#FF5A1F] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-stone-50">
                    {lang === 'ar'
                      ? 'دعوة عضو جديد'
                      : lang === 'fr'
                      ? 'Inviter un membre'
                      : 'Invite a Member'}
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-300">
                    {lang === 'ar'
                      ? 'إنشاء كود انضمام لمرة واحدة'
                      : lang === 'fr'
                      ? 'Générer un code à usage unique'
                      : 'Generate a single-use invitation code'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                disabled={isCreatingInvite}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteModalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{inviteModalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitInvite} className="space-y-4 text-xs">
              {/* Name (Optional) */}
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-200 uppercase tracking-wider text-[10px] block mb-1.5">
                  {lang === 'ar'
                    ? 'الاسم (اختياري)'
                    : lang === 'fr'
                    ? 'Nom (optionnel)'
                    : 'Name (optional)'}
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'مثال: كريم (نادل الصالة)'
                      : lang === 'fr'
                      ? 'ex. Karim (Serveur)'
                      : 'e.g. Karim (Waiter)'
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none font-semibold"
                />
              </div>

              {/* Role (Staff default or Admin) */}
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-200 uppercase tracking-wider text-[10px] block mb-1.5">
                  {lang === 'ar' ? 'الصلاحية' : lang === 'fr' ? 'Rôle' : 'Role'}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setInviteRole('staff')}
                    className={`p-3 rounded-xl border text-start transition-all cursor-pointer ${
                      inviteRole === 'staff'
                        ? 'border-[#FF5A1F] bg-orange-50 dark:bg-orange-950/30 text-stone-900 dark:text-stone-50 ring-1 ring-[#FF5A1F]'
                        : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <p className="font-extrabold text-xs">
                      {lang === 'ar' ? 'طاقم عمل (Staff)' : 'Staff'}
                    </p>
                    <p className="text-[10px] text-stone-500 dark:text-stone-300 mt-0.5">
                      {lang === 'ar'
                        ? 'الطلبات، الطاولات، فتح/إغلاق'
                        : lang === 'fr'
                        ? 'Commandes, tables, statut'
                        : 'Orders, tables, open/close'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRole('admin')}
                    className={`p-3 rounded-xl border text-start transition-all cursor-pointer ${
                      inviteRole === 'admin'
                        ? 'border-[#FF5A1F] bg-orange-50 dark:bg-orange-950/30 text-stone-900 dark:text-stone-50 ring-1 ring-[#FF5A1F]'
                        : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <p className="font-extrabold text-xs">
                      {lang === 'ar' ? 'مدير (Admin)' : 'Admin'}
                    </p>
                    <p className="text-[10px] text-stone-500 dark:text-stone-300 mt-0.5">
                      {lang === 'ar'
                        ? 'صلاحيات كاملة لإدارة المطعم'
                        : lang === 'fr'
                        ? 'Accès complet au restaurant'
                        : 'Full restaurant access'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Validity (1, 3, 7, 30 days) */}
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-200 uppercase tracking-wider text-[10px] block mb-1.5">
                  {lang === 'ar'
                    ? 'مدة صلاحية الكود'
                    : lang === 'fr'
                    ? 'Validité du code'
                    : 'Validity'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {VALIDITY_OPTIONS.map((days) => {
                    const selected = inviteDays === days;
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setInviteDays(days)}
                        className={`h-10 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                          selected
                            ? 'bg-[#FF5A1F] text-white border-[#FF5A1F] shadow-sm'
                            : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-750'
                        }`}
                      >
                        {days}{' '}
                        {lang === 'ar'
                          ? days === 1
                            ? 'يوم'
                            : 'أيام'
                          : lang === 'fr'
                          ? days === 1
                            ? 'jour'
                            : 'jours'
                          : days === 1
                          ? 'day'
                          : 'days'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  disabled={isCreatingInvite}
                  className="h-10 px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 font-bold hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : lang === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingInvite}
                  className="h-10 px-5 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingInvite ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ticket className="w-4 h-4" />
                  )}
                  <span>
                    {lang === 'ar'
                      ? 'إنشاء كود الدعوة'
                      : lang === 'fr'
                      ? 'Créer le code'
                      : 'Generate Code'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ONE-TIME INVITE CODE DISPLAY DIALOG                   */}
      {/* ======================================================== */}
      {createdInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 text-start space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Ticket className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-50">
                    {lang === 'ar'
                      ? 'كود الدعوة جاهز للمشاركة'
                      : lang === 'fr'
                      ? "Code d'invitation prêt"
                      : 'Invitation Code Ready'}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300">
                    {lang === 'ar'
                      ? 'صالح حتى: '
                      : lang === 'fr'
                      ? "Valable jusqu'au : "
                      : 'Valid until: '}
                    <span className="font-bold">
                      {formatTeamDateTime(createdInvite.expires_at, lang)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Security one-time warning */}
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">
                {lang === 'ar'
                  ? 'تنبيه مهم: انسخ هذا الكود أو شاركه الآن. لأسباب أمنية لن يتم عرضه مرة أخرى بعد إغلاق هذه النافذة.'
                  : lang === 'fr'
                  ? 'Important : copiez ou partagez ce code maintenant. Pour des raisons de sécurité, il ne sera plus affiché.'
                  : 'Important: Copy or share this code now. For security reasons, it will not be shown again after you close this dialog.'}
              </span>
            </div>

            {/* Monospace Code Box */}
            <div
              dir="ltr"
              className="p-4 rounded-2xl bg-stone-900 dark:bg-stone-950 border border-stone-800 text-center space-y-2"
            >
              <p className="font-mono font-black text-xl sm:text-2xl tracking-widest text-white select-all break-all">
                {createdInvite.code}
              </p>
              <div className="flex items-center justify-center">
                {getRoleBadge(createdInvite.role)}
              </div>
            </div>

            {/* Copy & Share on WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopyCode}
                className="h-11 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-750 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>
                      {lang === 'ar' ? 'تم النسخ!' : lang === 'fr' ? 'Copié !' : 'Copied!'}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>
                      {lang === 'ar' ? 'نسخ الكود' : lang === 'fr' ? 'Copier le code' : 'Copy Code'}
                    </span>
                  </>
                )}
              </button>

              <a
                href={buildWhatsAppHref(createdInvite)}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {lang === 'ar'
                    ? 'مشاركة عبر واتساب'
                    : lang === 'fr'
                    ? 'Partager sur WhatsApp'
                    : 'Share on WhatsApp'}
                </span>
              </a>
            </div>

            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={handleCloseOneTimeDialog}
                className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold text-xs cursor-pointer"
              >
                {lang === 'ar' ? 'تم، إغلاق' : lang === 'fr' ? 'Terminé' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
