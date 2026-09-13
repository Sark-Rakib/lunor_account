"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, KeyRound, Lock, Plus, ShieldCheck, Store, Users as UsersIcon, BellRing } from "lucide-react";
import { api } from "@/services/api";
import { useQuery } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataTable, { ActionButton, TableActions } from "@/components/ui/DataTable";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { useAuth } from "@/lib/auth";

const TABS = [
  { key: "business", label: "Business", icon: Store },
  { key: "orders", label: "Orders & Inventory", icon: Building2 },
  { key: "notifications", label: "Notifications", icon: BellRing },
  { key: "users", label: "Users & Roles", icon: UsersIcon },
  { key: "security", label: "Security", icon: Lock },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("business");
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings"),
  });

  const s = data?.settings;

  if (s && !settings) {
    setSettings(s);
    setForm({
      businessName: s.businessName || "",
      tagline: s.tagline || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      currency: s.currency || "BDT",
      currencySymbol: s.currencySymbol || "৳",
      timezone: s.timezone || "Asia/Dhaka",
      registrationEnabled: !!s.registrationEnabled,
      invoicePrefix: s.invoicePrefix || "INV",
      orderPrefix: s.orderPrefix || "ORD",
      purchasePrefix: s.purchasePrefix || "PUR",
      returnPrefix: s.returnPrefix || "RET",
      order: { ...(s.orderSettings || {}) },
      inventory: { ...(s.inventorySettings || {}) },
      notif: { ...(s.notificationSettings || {}) },
    });
  }

  if (isLoading || !form) {
    return (
      <div className="space-y-4">
        <PageHeader title="Settings" />
        <div className="h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
      </div>
    );
  }

  const set = (path, value) => {
    setForm((prev) => {
      if (path.includes(".")) {
        const [a, b] = path.split(".");
        return { ...prev, [a]: { ...prev[a], [b]: value } };
      }
      return { ...prev, [path]: value };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings", {
        general: {
          businessName: form.businessName,
          tagline: form.tagline,
          phone: form.phone,
          email: form.email,
          address: form.address,
          currency: form.currency,
          currencySymbol: form.currencySymbol,
          timezone: form.timezone,
          registrationEnabled: form.registrationEnabled,
          invoicePrefix: form.invoicePrefix,
          orderPrefix: form.orderPrefix,
          purchasePrefix: form.purchasePrefix,
          returnPrefix: form.returnPrefix,
        },
        orderSettings: form.order,
        inventorySettings: form.inventory,
        notificationSettings: form.notif,
      });
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Configure your business, orders, notifications and team."
        actions={<Button onClick={save} loading={saving} disabled={!form}>Save changes</Button>}
      />

      <div className="flex flex-wrap gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isAdminOnly = t.key === "users";
          if (isAdminOnly && user?.role !== "admin") return null;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.key ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              <Icon className="size-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "business" && <BusinessTab form={form} set={set} />}
      {tab === "orders" && <OrdersTab form={form} set={set} />}
      {tab === "notifications" && <NotificationsTab form={form} set={set} />}
      {tab === "users" && <UsersTab />}
      {tab === "security" && <SecurityTab />}
    </div>
  );
}

const inputRow = "grid gap-4 md:grid-cols-2";

function CardShell({ title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-xs text-zinc-400">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BusinessTab({ form, set }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CardShell title="Business profile">
        <div className={inputRow}>
          <Field label="Business name" required>
            <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
          </Field>
          <Field label="Tagline">
            <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </div>
        <Field label="Address" className="mt-4">
          <Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input type="checkbox" checked={form.registrationEnabled} onChange={(e) => set("registrationEnabled", e.target.checked)} className="size-4 rounded border-zinc-300 accent-indigo-600" />
          Allow self-registration on the login screen
        </label>
      </CardShell>

      <CardShell title="Regional & numbering">
        <div className={inputRow}>
          <Field label="Currency">
            <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} />
          </Field>
          <Field label="Currency symbol">
            <Input value={form.currencySymbol} onChange={(e) => set("currencySymbol", e.target.value)} />
          </Field>
          <Field label="Timezone">
            <Input value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
          </Field>
          <Field label="" />
          <Field label="Invoice prefix">
            <Input value={form.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} />
          </Field>
          <Field label="Order prefix">
            <Input value={form.orderPrefix} onChange={(e) => set("orderPrefix", e.target.value)} />
          </Field>
          <Field label="Purchase prefix">
            <Input value={form.purchasePrefix} onChange={(e) => set("purchasePrefix", e.target.value)} />
          </Field>
          <Field label="Return prefix">
            <Input value={form.returnPrefix} onChange={(e) => set("returnPrefix", e.target.value)} />
          </Field>
        </div>
      </CardShell>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 py-3 text-left">
      <span>
        <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">{label}</span>
        {hint && <span className="block text-xs text-zinc-400">{hint}</span>}
      </span>
      <span className={cn("flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors", checked ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700")}>
        <span className={cn("size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
      </span>
    </button>
  );
}

function OrdersTab({ form, set }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CardShell title="Order behaviour">
        <Field label="Default status for new orders">
          <Select value={form.order.defaultStatus || "Pending"} onChange={(e) => set("order.defaultStatus", e.target.value)}>
            {["Pending", "Confirmed", "Processing", "Shipped", "Delivered"].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          <Toggle label="Auto-confirm orders" hint="Move new orders straight to Confirmed." checked={!!form.order.autoConfirm} onChange={(v) => set("order.autoConfirm", v)} />
          <Toggle label="Deduct stock on confirm" hint="Remove items from inventory when an order is confirmed." checked={!!form.order.autoDeductStockOnConfirm} onChange={(v) => set("order.autoDeductStockOnConfirm", v)} />
        </div>
      </CardShell>
      <CardShell title="Inventory alerts">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <Toggle label="Low stock alerts" hint="Notify when products fall to or below minimum stock." checked={!!form.inventory.lowStockAlert} onChange={(v) => set("inventory.lowStockAlert", v)} />
          <Toggle label="Out of stock alerts" hint="Notify immediately when a product hits zero." checked={!!form.inventory.outStockAlert} onChange={(v) => set("inventory.outStockAlert", v)} />
        </div>
      </CardShell>
    </div>
  );
}

function NotificationsTab({ form, set }) {
  const items = [
    { key: "lowStock", label: "Low stock", hint: "Products below minimum stock." },
    { key: "outStock", label: "Out of stock", hint: "Products with zero stock." },
    { key: "pendingOrders", label: "Pending orders", hint: "Orders awaiting confirmation." },
    { key: "dues", label: "Customer dues", hint: "Overdue customer balances." },
    { key: "targets", label: "Target milestones", hint: "When sales targets are hit." },
    { key: "returns", label: "Returns", hint: "When items are returned." },
  ];
  return (
    <Card className="max-w-xl">
      <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {items.map((it) => (
          <Toggle key={it.key} label={it.label} hint={it.hint} checked={!!form.notif[it.key]} onChange={(v) => set(`notif.${it.key}`, v)} />
        ))}
      </CardContent>
    </Card>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [deactivate, setDeactivate] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", page],
    queryFn: () => api.get("/users", { params: { page, limit: 20 } }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const users = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModal({ mode: "create" })}><Plus className="size-4" /> Add user</Button>
      </div>
      <DataTable
        loading={isLoading}
        data={users}
        keyField="_id"
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setPage}
        columns={[
          {
            key: "name",
            header: "User",
            render: (u) => (
              <div>
                <p className="flex items-center gap-1.5 font-medium text-zinc-800 dark:text-zinc-100">
                  {u.name}
                  {u.role === "admin" && <ShieldCheck className="size-3.5 text-indigo-500" />}
                </p>
                <p className="text-xs text-zinc-400">{u.email}</p>
              </div>
            ),
          },
          { key: "role", header: "Role", render: (u) => <StatusBadgePill role={u.role} /> },
          {
            key: "active",
            header: "Status",
            render: (u) => (
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", u.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400")}>
                {u.active ? "Active" : "Inactive"}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            align: "right",
            render: (u) => (
              <TableActions>
                <ActionButton icon={Lock} label="Edit" tone="edit" onClick={() => setModal({ mode: "edit", user: u })} />
                {u.active && (
                  <ActionButton icon={UsersIcon} label="Deactivate" tone="danger" onClick={() => setDeactivate(u)} />
                )}
              </TableActions>
            ),
          },
        ]}
      />
      {modal && <UserModal mode={modal.mode} user={modal.user} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
      {deactivate && <DeactivateDialog user={deactivate} onClose={() => setDeactivate(null)} onDone={() => { setDeactivate(null); refresh(); }} />}
    </div>
  );
}

function StatusBadgePill({ role }) {
  const label = ROLE_LABELS[role] || role;
  const style = role === "admin"
    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", style)}>{label}</span>;
}

function UserModal({ mode, user, onClose, onDone }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    role: user?.role || "staff",
    password: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      if (mode === "edit") {
        const payload = { name: form.name, email: form.email, phone: form.phone, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${user._id}`, payload);
      } else {
        await api.post("/users", form);
      }
      toast.success(mode === "edit" ? "User updated" : "User created");
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "edit" ? "Edit user" : "Add user"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{mode === "edit" ? "Save changes" : "Create user"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </Select>
        </Field>
        <Field label="Email" required>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label={mode === "edit" ? "New password (optional)" : "Password"} required={mode === "create"} hint={mode === "edit" ? "Leave blank to keep current." : "Minimum 6 characters."}>
          <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function DeactivateDialog({ user, onClose, onDone }) {
  const [loading, setLoading] = useState(false);
  const deactivate = async () => {
    setLoading(true);
    try {
      await api.delete(`/users/${user._id}`);
      toast.success("User deactivated");
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={deactivate}
      loading={loading}
      title={`Deactivate ${user.name}?`}
      description="They will no longer be able to sign in."
    />
  );
}

function SecurityTab() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (form.newPassword.length < 6) return toast.error("New password must be at least 6 characters");
    if (form.newPassword !== form.confirmPassword) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      await api.post("/auth/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success("Password changed");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CardShell title="Change password">
        <div className="space-y-4">
          <Field label="Current password">
            <Input type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
          </Field>
          <Field label="New password">
            <Input type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
          </Field>
          <Button onClick={submit} loading={busy}><KeyRound className="size-4" /> Update password</Button>
        </div>
      </CardShell>
      <CardShell title="Your account">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Signed in as <span className="font-semibold text-zinc-800 dark:text-zinc-100">{user?.name}</span> ({ROLE_LABELS[user?.role] || user?.role}).</p>
        <p className="mt-1 text-sm text-zinc-400">{user?.email}</p>
      </CardShell>
    </div>
  );
}