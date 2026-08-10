import { useEffect, useMemo, useState } from "react";
import {
  allCategories,
  displayName,
  integrationsFor,
  roleLabel,
  userInitials,
} from "../../domain/profile";
import { userTeams } from "../../domain/teams";
import type { Category, UserPreferences, Visibility } from "../../domain/types";
import { useStore } from "../../store";
import { visibilityOrder } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Card, CardContent } from "../../components/ui/card";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-0">
      <span className="grid gap-1">
        <span className="font-medium text-foreground">{label}</span>
        {description && <span className="text-sm text-muted-foreground">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

export default function Profile() {
  const {
    org,
    user,
    allUsers,
    updateUser,
    userPreferences,
    updateUserPreferences,
    questions,
    canView,
    orgTeams,
    teamJoinRequests,
    requestTeamJoin,
    approveTeamJoinRequest,
    rejectTeamJoinRequest,
  } = useStore();

  const [personalDraft, setPersonalDraft] = useState({
    name: user.name,
    email: user.email ?? "",
    title: user.title ?? "",
  });
  const [personalSaved, setPersonalSaved] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [requestedTeam, setRequestedTeam] = useState("");

  useEffect(() => {
    setPersonalDraft({
      name: user.name,
      email: user.email ?? "",
      title: user.title ?? "",
    });
    setPersonalSaved(false);
    setPrefsSaved(false);
    setRequestedTeam("");
  }, [user.id, user.name, user.email, user.title]);

  const memberships = useMemo(() => userTeams(user), [user]);
  const visibleQuestionCount = useMemo(
    () => questions.filter(canView).length,
    [questions, canView],
  );
  const integrations = useMemo(() => integrationsFor(user.role), [user.role]);

  const myPendingRequests = useMemo(
    () => teamJoinRequests.filter((r) => r.userId === user.id && r.status === "pending"),
    [teamJoinRequests, user.id],
  );

  const availableTeams = useMemo(() => {
    const blocked = new Set([...memberships, ...myPendingRequests.map((r) => r.team)]);
    return orgTeams.filter((team) => !blocked.has(team));
  }, [memberships, myPendingRequests, orgTeams]);

  const adminPendingRequests = useMemo(
    () => (user.role === "admin" ? teamJoinRequests.filter((r) => r.status === "pending") : []),
    [teamJoinRequests, user.role],
  );

  const userNameById = (id: string) => {
    const match = allUsers.find((u) => u.id === id);
    return match ? displayName(match) : id;
  };

  const handlePersonalSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name: personalDraft.name.trim() || user.name,
      email: personalDraft.email.trim(),
      title: personalDraft.title.trim(),
    });
    setPersonalSaved(true);
    window.setTimeout(() => setPersonalSaved(false), 2500);
  };

  const handlePrefChange = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    updateUserPreferences({ [key]: value });
    setPrefsSaved(true);
    window.setTimeout(() => setPrefsSaved(false), 2000);
  };

  const toggleDomain = (domain: Category) => {
    const next = userPreferences.expertiseDomains.includes(domain)
      ? userPreferences.expertiseDomains.filter((d) => d !== domain)
      : [...userPreferences.expertiseDomains, domain];
    handlePrefChange("expertiseDomains", next);
  };

  const handleTeamRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedTeam) return;
    requestTeamJoin(requestedTeam);
    setRequestedTeam("");
  };

  return (
    <>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Manage your account, notifications, and forecasting defaults for {org.name}.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto]">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
              aria-hidden="true"
            >
              {userInitials(user)}
            </div>
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-foreground">
                {displayName(user)}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {user.title ?? roleLabel(user.role)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                  {roleLabel(user.role)}
                </span>
                {memberships.map((team) => (
                  <span
                    key={team}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {team}
                  </span>
                ))}
                <span className="text-sm text-muted-foreground">
                  Member since {formatDate(user.joinedAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-muted">
            <div className="p-4 text-center">
              <div className="text-xl font-semibold text-foreground">{visibleQuestionCount}</div>
              <div className="mt-1 text-xs text-muted-foreground">Visible forecasts</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-xl font-semibold text-foreground">{memberships.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">Teams</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-xl font-semibold text-foreground">
                {userPreferences.expertiseDomains.length}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Expertise domains</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between text-base font-semibold text-foreground">
            <span>Personal information</span>
            {personalSaved && <span className="text-sm text-muted-foreground">Saved</span>}
          </div>
          <form className="space-y-5" onSubmit={handlePersonalSave}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-foreground [&_input]:h-9 [&_input]:rounded-md [&_input]:border [&_input]:border-input [&_input]:bg-background [&_input]:px-3 [&_input]:text-sm">
                <span>Name</span>
                <Input
                  type="text"
                  value={personalDraft.name}
                  onChange={(e) => setPersonalDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-foreground [&_input]:h-9 [&_input]:rounded-md [&_input]:border [&_input]:border-input [&_input]:bg-background [&_input]:px-3 [&_input]:text-sm">
                <span>Email</span>
                <Input
                  type="email"
                  value={personalDraft.email}
                  onChange={(e) => setPersonalDraft((d) => ({ ...d, email: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-foreground [&_input]:h-9 [&_input]:rounded-md [&_input]:border [&_input]:border-input [&_input]:bg-background [&_input]:px-3 [&_input]:text-sm">
                <span>Department</span>
                <Input
                  type="text"
                  value={user.department ?? user.team}
                  readOnly
                  className="bg-muted text-muted-foreground"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-foreground [&_input]:h-9 [&_input]:rounded-md [&_input]:border [&_input]:border-input [&_input]:bg-background [&_input]:px-3 [&_input]:text-sm">
                <span>Job title</span>
                <Input
                  type="text"
                  value={personalDraft.title}
                  onChange={(e) => setPersonalDraft((d) => ({ ...d, title: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="">
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between text-base font-semibold text-foreground">
            <span>Teams</span>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="text-sm font-medium text-foreground">Your teams</span>
              <div className="flex flex-wrap gap-2">
                {memberships.map((team) => (
                  <span
                    key={team}
                    className="rounded-full bg-muted px-2.5 py-1 text-sm text-muted-foreground"
                  >
                    {team}
                  </span>
                ))}
              </div>
            </div>

            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={handleTeamRequest}
            >
              <label className="flex items-center justify-between gap-4 text-sm font-medium text-foreground [&_select]:h-9 [&_select]:rounded-md [&_select]:border [&_select]:border-input [&_select]:bg-background [&_select]:px-3 [&_select]:text-sm">
                <span>Request to join</span>
                <Select
                  value={requestedTeam || null}
                  onValueChange={(value) => setRequestedTeam(value ?? "")}
                  disabled={availableTeams.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        availableTeams.length === 0
                          ? "No additional teams available"
                          : "Select a team"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeams.map((team) => (
                      <SelectItem key={team} value={team}>
                        {team}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <Button type="submit" className="" disabled={!requestedTeam}>
                Submit request
              </Button>
            </form>

            {myPendingRequests.length > 0 && (
              <div className="space-y-3">
                <span className="text-sm font-medium text-foreground">Outstanding requests</span>
                <div className="overflow-hidden rounded-lg border border-border">
                  {myPendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between gap-4 border-b border-border p-4 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-foreground">{request.team}</div>
                        <div className="text-sm text-muted-foreground">
                          Requested {formatDate(request.requestedAt)}
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                        Pending admin approval
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {user.role === "admin" && adminPendingRequests.length > 0 && (
            <div className="border-t border-border pt-6">
              <div className="text-sm font-medium text-foreground">Administrator review</div>
              <p className="mb-4 text-sm text-muted-foreground">
                Approve or reject team membership requests for your organization.
              </p>
              <div className="overflow-hidden rounded-lg border border-border">
                {adminPendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between gap-4 border-b border-border p-4 last:border-0"
                  >
                    <div>
                      <div className="font-medium text-foreground">{request.team}</div>
                      <div className="text-sm text-muted-foreground">
                        {userNameById(request.userId)} · Requested {formatDate(request.requestedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        className="border border-border bg-background text-foreground hover:bg-muted"
                        onClick={() => approveTeamJoinRequest(request.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => rejectTeamJoinRequest(request.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between text-base font-semibold text-foreground">
            <span>Notifications</span>
            {prefsSaved && <span className="text-sm text-muted-foreground">Updated</span>}
          </div>
          <div className="mb-2">
            <label className="flex items-center justify-between gap-4 text-sm font-medium text-foreground [&_select]:h-9 [&_select]:rounded-md [&_select]:border [&_select]:border-input [&_select]:bg-background [&_select]:px-3 [&_select]:text-sm">
              <span>Email digest</span>
              <Select
                value={userPreferences.emailDigest}
                onValueChange={(value) =>
                  value && handlePrefChange("emailDigest", value as UserPreferences["emailDigest"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily summary</SelectItem>
                  <SelectItem value="weekly">Weekly rollup</SelectItem>
                  <SelectItem value="none">Off</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
          <div className="divide-y divide-border">
            <Toggle
              checked={userPreferences.probabilityAlerts}
              onChange={(v) => handlePrefChange("probabilityAlerts", v)}
              label="Probability threshold alerts"
              description="Email when a watched forecast crosses your alert threshold"
            />
            <Toggle
              checked={userPreferences.commentMentions}
              onChange={(v) => handlePrefChange("commentMentions", v)}
              label="Comment mentions"
              description="Notify when someone @mentions you on a forecast thread"
            />
            <Toggle
              checked={userPreferences.contextApprovalRequests}
              onChange={(v) => handlePrefChange("contextApprovalRequests", v)}
              label="Context approval requests"
              description="Route restricted context submissions to your inbox"
            />
            <Toggle
              checked={userPreferences.weeklySummary}
              onChange={(v) => handlePrefChange("weeklySummary", v)}
              label="Executive weekly summary"
              description="Top movers, new risks, and calibration drift for your scope"
            />
            <Toggle
              checked={userPreferences.productUpdates}
              onChange={(v) => handlePrefChange("productUpdates", v)}
              label="Product updates"
              description="Release notes and methodology changes from Signal Ridge"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between text-base font-semibold text-foreground">
            <span>Forecasting defaults</span>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Pre-fill visibility and domain tags when you create forecasts or submit context.
          </p>
          <label className="flex items-center justify-between gap-4 text-sm font-medium text-foreground [&_select]:h-9 [&_select]:rounded-md [&_select]:border [&_select]:border-input [&_select]:bg-background [&_select]:px-3 [&_select]:text-sm">
            <span>Default visibility</span>
            <Select
              value={userPreferences.defaultVisibility}
              onValueChange={(value) =>
                value && handlePrefChange("defaultVisibility", value as Visibility)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibilityOrder.map((visibility) => (
                  <SelectItem key={visibility} value={visibility}>
                    {visibility}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="mt-6 space-y-3">
            <span className="text-sm font-medium text-foreground">Expertise domains</span>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => {
                const active = userPreferences.expertiseDomains.includes(cat);
                return (
                  <Button
                    key={cat}
                    type="button"
                    className={
                      active
                        ? "rounded-full border border-primary bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary"
                        : "rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                    }
                    onClick={() => toggleDomain(cat)}
                  >
                    {cat}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between text-base font-semibold text-foreground">
            <span>Connected integrations</span>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between gap-4 border-b border-border p-4 last:border-0"
              >
                <div>
                  <div className="font-medium text-foreground">{integration.name}</div>
                  <div className="text-sm text-muted-foreground">{integration.description}</div>
                  {integration.connectedAt && (
                    <div className="text-sm text-muted-foreground">
                      Connected {formatDate(integration.connectedAt)}
                    </div>
                  )}
                </div>
                <span
                  className={
                    integration.status === "connected"
                      ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"
                      : integration.status === "pending"
                        ? "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
                        : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  }
                >
                  {integration.status === "connected"
                    ? "Connected"
                    : integration.status === "pending"
                      ? "Pending IT"
                      : "Available"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between text-base font-semibold text-foreground">
            <span>Data &amp; account</span>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Export your forecast activity and comments for compliance requests. Account deactivation
            requires admin approval.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="border border-border bg-background text-foreground hover:bg-muted"
            >
              Export my data
            </Button>
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive"
            >
              Request deactivation
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
