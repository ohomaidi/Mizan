"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  UserPlus,
  Trash2,
  CheckCircle2,
  XCircle,
  Mail,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtRelative } from "@/lib/i18n/time";
import { api } from "@/lib/api/client";

type Role = "admin" | "analyst" | "viewer";

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  lastLoginAt: string | null;
  pending: boolean;
};

export function UsersPanel() {
  const { t } = useI18n();
  const fmtRelative = useFmtRelative();
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.listUsers();
      setRows(r.users);
    } catch (err) {
      setError((err as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const onInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteError(null);
    try {
      await api.inviteUser({
        email: inviteEmail.trim(),
        role: inviteRole,
        displayName: inviteName.trim(),
      });
      setInviteEmail("");
      setInviteName("");
      setInviteRole("viewer");
      await load();
    } catch (err) {
      setInviteError((err as Error).message);
    } finally {
      setInviting(false);
    }
  };

  const onChangeRole = async (id: string, role: Role) => {
    setBusy(id);
    try {
      await api.updateUser(id, { role });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onToggleActive = async (id: string, next: boolean) => {
    setBusy(id);
    try {
      await api.updateUser(id, { isActive: next });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm(t("users.deleteConfirm"))) return;
    setBusy(id);
    try {
      await api.deleteUser(id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader title={t("users.title")} subtitle={t("users.subtitle")} />
      {/* Invite row */}
      <div className="rounded-md border border-border bg-surface-2 p-4 mb-4">
        <div className="text-[11.5px] uppercase tracking-[0.06em] text-ink-3 mb-2 inline-flex items-center gap-1.5">
          <UserPlus size={12} /> {t("users.invite.title")}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2">
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            type="email"
            dir="ltr"
            placeholder="someone@example.com"
            className={inputClass}
          />
          <input
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            dir="ltr"
            placeholder={t("users.invite.displayName")}
            className={inputClass}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            className={inputClass}
          >
            <option value="admin">{t("authCfg.role.admin")}</option>
            <option value="analyst">{t("authCfg.role.analyst")}</option>
            <option value="viewer">{t("authCfg.role.viewer")}</option>
          </select>
          <button
            onClick={onInvite}
            disabled={inviting || !/.+@.+\..+/.test(inviteEmail)}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
          >
            {inviting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Mail size={13} />
            )}
            {t("users.invite.submit")}
          </button>
        </div>
        <div className="text-[11.5px] text-ink-3 mt-2">
          {t("users.invite.helper")}
        </div>
        {inviteError ? (
          <div className="text-[11.5px] text-neg mt-2">{inviteError}</div>
        ) : null}
      </div>

      {error ? (
        <div className="text-[12px] text-neg mb-3">{error}</div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em]">
              <th className="text-start font-semibold py-2.5">{t("users.col.user")}</th>
              <th className="text-start font-semibold py-2.5">{t("users.col.role")}</th>
              <th className="text-start font-semibold py-2.5">{t("users.col.status")}</th>
              <th className="text-start font-semibold py-2.5">{t("users.col.lastLogin")}</th>
              <th className="text-end font-semibold py-2.5">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-ink-3">
                  {t("state.loading")}
                </td>
              </tr>
            ) : rows && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-ink-3">
                  {t("users.empty")}
                </td>
              </tr>
            ) : (
              (rows ?? []).map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-3 pe-3">
                    <div className="text-ink-1">{u.displayName || u.email}</div>
                    <div className="text-[11.5px] text-ink-3 keep-ltr" dir="ltr">
                      {u.email}
                    </div>
                  </td>
                  <td className="py-3 pe-3">
                    <select
                      value={u.role}
                      disabled={busy === u.id}
                      onChange={(e) => onChangeRole(u.id, e.target.value as Role)}
                      className="h-8 px-2 rounded border border-border bg-surface-1 text-[12.5px]"
                    >
                      <option value="admin">{t("authCfg.role.admin")}</option>
                      <option value="analyst">{t("authCfg.role.analyst")}</option>
                      <option value="viewer">{t("authCfg.role.viewer")}</option>
                    </select>
                  </td>
                  <td className="py-3 pe-3">
                    {u.pending ? (
                      <span className="inline-flex items-center gap-1 text-[11.5px] text-warn">
                        <Mail size={11} /> {t("users.status.pending")}
                      </span>
                    ) : u.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11.5px] text-pos">
                        <CheckCircle2 size={11} /> {t("users.status.active")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-3">
                        <XCircle size={11} /> {t("users.status.disabled")}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pe-3 text-ink-3 tabular">
                    {u.lastLoginAt ? fmtRelative(u.lastLoginAt) : "—"}
                  </td>
                  <td className="py-3 text-end">
                    <div className="inline-flex items-center gap-1">
                      {u.isActive ? (
                        <button
                          onClick={() => onToggleActive(u.id, false)}
                          disabled={busy === u.id}
                          title={t("users.action.disable")}
                          className="h-7 px-2 rounded border border-border text-ink-2 hover:text-ink-1 text-[11.5px] disabled:opacity-50"
                        >
                          {t("users.action.disable")}
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleActive(u.id, true)}
                          disabled={busy === u.id}
                          title={t("users.action.enable")}
                          className="h-7 px-2 rounded border border-border text-ink-2 hover:text-ink-1 text-[11.5px] disabled:opacity-50"
                        >
                          {t("users.action.enable")}
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(u.id)}
                        disabled={busy === u.id}
                        title={t("users.action.delete")}
                        className="h-7 w-7 grid place-items-center rounded border border-border text-ink-3 hover:text-neg hover:border-neg/40 disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const inputClass =
  "w-full h-9 px-3 rounded-md border border-border bg-surface-1 text-[13px] text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-council-strong focus:ring-2 focus:ring-[var(--ring)]";
