import { CONNECTORS } from "./connectors";
import { requiresApproval } from "./contextAccess";
import { evidenceSources } from "./seed";
import { seedTouchpointSignals } from "./touchpoints";
import type {
  ContextAuditEntry,
  ContextBinding,
  ContextItem,
  ContextRevision,
  CreateContextItemInput,
  EvidenceSource,
  ForecastQuestion,
  ModelContextBundle,
  User,
} from "./types";

const KIND_TO_CONNECTOR: Record<string, string> = {
  slack: "slack",
  teams: "teams",
  excel: "excel",
  survey: "google-forms",
  interview: "google-meet",
};

function connectorForKind(kind: string, sourceId?: string): string | undefined {
  if (kind === "custom" && sourceId) return sourceId;
  if (kind === "upload") return undefined;
  return KIND_TO_CONNECTOR[kind] ?? sourceId;
}

function buildSeedItems(): ContextItem[] {
  const items: ContextItem[] = [];
  const seen = new Set<string>();

  for (const [, signals] of Object.entries(seedTouchpointSignals)) {
    for (const signal of signals) {
      const connectorId = connectorForKind(signal.kind, signal.sourceId);
      const key = connectorId ?? `upload-${signal.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (signal.kind === "upload") continue;

      const connector = connectorId ? CONNECTORS.find((c) => c.id === connectorId) : undefined;
      const appName = connector?.name ?? signal.label ?? signal.kind;
      items.push({
        id: `ctx-app-${key}`,
        type: "manual",
        title: signal.summary.length > 72 ? `${signal.summary.slice(0, 69)}…` : signal.summary,
        description: `From ${appName}`,
        body: signal.summary,
        visibility: "team",
        owningTeam: "Strategy",
        createdBy: "u-analyst",
        createdAt: "2026-06-01",
        updatedAt: signal.updatedAt,
        status: "active",
        connectorId: connectorId ?? signal.sourceId,
        tags: [signal.kind],
      });
    }
  }

  items.push({
    id: "ctx-doc-supplier-risk",
    type: "document",
    title: "Supplier risk workbook",
    description: "Shared Excel export — lead times, payment disputes, tier classifications",
    visibility: "team",
    owningTeam: "Operations",
    createdBy: "u-analyst",
    createdAt: "2026-05-15",
    updatedAt: "2026-06-25",
    status: "active",
    fileNames: ["supplier-risk-workbook.xlsx"],
    tags: ["supply-chain"],
  });

  for (const ev of evidenceSources) {
    const pending = ev.sourceClass === "org_internal";
    items.push({
      id: `ctx-ev-${ev.id}`,
      type: "evidence",
      title: ev.title,
      description: `${ev.sourceClass.replace("_", " ")} · credibility ${Math.round(ev.credibilityScore * 100)}%`,
      visibility: pending ? "restricted" : "public",
      owningTeam: "Risk",
      createdBy: "u-risk",
      createdAt: ev.retrievedAt,
      updatedAt: ev.retrievedAt,
      status: pending ? "pending_approval" : "active",
      evidenceClass: ev.sourceClass,
      evidenceUrl: ev.url,
      credibilityScore: ev.credibilityScore,
      tags: ev.disconfirming ? ["disconfirming"] : undefined,
    });
  }

  items.push({
    id: "ctx-instruction-forecasting",
    type: "instruction",
    title: "Org forecasting standards",
    description: "Standing instructions for all model runs",
    visibility: "public",
    owningTeam: "Risk",
    createdBy: "u-risk",
    createdAt: "2026-01-01",
    updatedAt: "2026-06-01",
    status: "active",
    body:
      "Always anchor on outside-view base rates before case-specific adjustments. " +
      "Record every probability move with a trigger. Separate forecast from recommendation. " +
      "Fetch disconfirming evidence for leadership-tier questions.",
    tags: ["methodology"],
  });

  items.push({
    id: "ctx-manual-geo-assumptions",
    type: "manual",
    title: "Geopolitical scenario assumptions",
    description: "Private analyst notes on escalation pathways",
    visibility: "leadership",
    owningTeam: "Strategy",
    createdBy: "u-analyst",
    createdAt: "2026-06-10",
    updatedAt: "2026-06-20",
    status: "active",
    body:
      "Assume NATO coordination remains intact through Q4. Energy price pass-through capped at 15% for EU ops. " +
      "Sanctions enforcement probability weighted at 0.7 for secondary targets.",
    tags: ["geopolitical"],
  });

  return items;
}

function buildSeedBindings(items: ContextItem[]): ContextBinding[] {
  const bindings: ContextBinding[] = [];
  let bindIdx = 0;

  for (const [questionId, signals] of Object.entries(seedTouchpointSignals)) {
    for (const signal of signals) {
      const connectorId = connectorForKind(signal.kind, signal.sourceId);
      const itemId = connectorId ? `ctx-app-${connectorId}` : null;
      if (!itemId || !items.some((i) => i.id === itemId)) continue;
      bindings.push({
        id: `bind-seed-${bindIdx++}`,
        questionId,
        contextItemId: itemId,
        attachedBy: "u-risk",
        attachedAt: signal.updatedAt,
        notes: `From ${signal.label ?? signal.kind}`,
      });
    }
  }

  if (items.some((i) => i.id === "ctx-doc-supplier-risk")) {
    bindings.push({
      id: "bind-seed-supplier",
      questionId: "q-supplier-default",
      contextItemId: "ctx-doc-supplier-risk",
      attachedBy: "u-analyst",
      attachedAt: "2026-06-25",
      notes: "Primary supplier risk workbook",
    });
  }

  bindings.push({
    id: "bind-seed-instruction",
    questionId: "q-geo",
    contextItemId: "ctx-instruction-forecasting",
    attachedBy: "u-risk",
    attachedAt: "2026-06-01",
    notes: "Standing forecasting instructions",
  });

  bindings.push({
    id: "bind-seed-manual-geo",
    questionId: "q-geo",
    contextItemId: "ctx-manual-geo-assumptions",
    attachedBy: "u-analyst",
    attachedAt: "2026-06-20",
    notes: "Regional escalation assumptions",
  });

  return bindings;
}

function buildSeedRevisions(): ContextRevision[] {
  return [
    {
      id: "rev-1",
      contextItemId: "ctx-instruction-forecasting",
      version: 1,
      body:
        "Always anchor on outside-view base rates before case-specific adjustments. " +
        "Record every probability move with a trigger. Separate forecast from recommendation. " +
        "Fetch disconfirming evidence for leadership-tier questions.",
      changedBy: "u-risk",
      changedAt: "2026-06-01",
      changeSummary: "Initial version",
    },
    {
      id: "rev-2",
      contextItemId: "ctx-manual-geo-assumptions",
      version: 1,
      body:
        "Assume NATO coordination remains intact through Q4. Energy price pass-through capped at 15% for EU ops. " +
        "Sanctions enforcement probability weighted at 0.7 for secondary targets.",
      changedBy: "u-analyst",
      changedAt: "2026-06-20",
      changeSummary: "Initial version",
    },
  ];
}

export const seedContextItems: ContextItem[] = buildSeedItems();
export const seedContextBindings: ContextBinding[] = buildSeedBindings(seedContextItems);
export const seedContextRevisions: ContextRevision[] = buildSeedRevisions();
export const seedContextAudit: ContextAuditEntry[] = [
  {
    id: "audit-seed-1",
    actorId: "u-risk",
    action: "create",
    resourceType: "context_item",
    resourceId: "ctx-instruction-forecasting",
    timestamp: "2026-06-01T10:00:00Z",
    detail: "Created org forecasting standards instruction",
  },
];

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function initialStatus(input: CreateContextItemInput): ContextItem["status"] {
  if (requiresApproval({ visibility: input.visibility ?? "team", evidenceClass: input.evidenceClass })) {
    return "pending_approval";
  }
  return "active";
}

export function createContextItemFromInput(
  input: CreateContextItemInput,
  user: User,
  now = new Date().toISOString()
): ContextItem {
  const connector = input.connectorId ? CONNECTORS.find((c) => c.id === input.connectorId) : undefined;
  const status = initialStatus(input);
  return {
    id: newId("ctx"),
    type: input.type,
    title: input.title.trim(),
    description: input.description?.trim(),
    visibility: input.visibility ?? "team",
    owningTeam: input.owningTeam ?? user.team,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
    status,
    tags: input.tags,
    connectorId: input.connectorId,
    lastSyncAt: input.type === "connector" ? now.slice(0, 10) : undefined,
    syncSummary:
      input.type === "connector"
        ? `${connector?.name ?? input.title} connected — awaiting first sync`
        : undefined,
    fileNames: input.fileNames,
    body: input.body,
    evidenceClass: input.evidenceClass,
    evidenceUrl: input.evidenceUrl,
    credibilityScore: input.credibilityScore,
  };
}

export function contextItemToEvidence(item: ContextItem): EvidenceSource | null {
  if (item.type !== "evidence" || !item.evidenceClass) return null;
  return {
    id: item.id,
    title: item.title,
    url: item.evidenceUrl,
    sourceClass: item.evidenceClass,
    credibilityScore: item.credibilityScore ?? 0.5,
    retrievedAt: item.updatedAt,
    disconfirming: item.tags?.includes("disconfirming"),
  };
}

export function bindingCountForItem(itemId: string, bindings: ContextBinding[]): number {
  return bindings.filter((b) => b.contextItemId === itemId).length;
}

export function bindingsForQuestion(questionId: string, bindings: ContextBinding[]): ContextBinding[] {
  return bindings.filter((b) => b.questionId === questionId);
}

export function itemsForQuestion(
  questionId: string,
  items: ContextItem[],
  bindings: ContextBinding[]
): ContextItem[] {
  const ids = new Set(bindingsForQuestion(questionId, bindings).map((b) => b.contextItemId));
  return items.filter((i) => ids.has(i.id) && i.status !== "archived");
}

export function revisionsForItem(itemId: string, revisions: ContextRevision[]): ContextRevision[] {
  return revisions
    .filter((r) => r.contextItemId === itemId)
    .sort((a, b) => b.version - a.version);
}

export function assembleModelContext(
  questionId: string,
  items: ContextItem[],
  bindings: ContextBinding[],
  questions: ForecastQuestion[]
): ModelContextBundle {
  const bound = itemsForQuestion(questionId, items, bindings).filter((i) => i.status === "active");
  const question = questions.find((q) => q.id === questionId);

  const instructions = bound
    .filter((i) => i.type === "instruction")
    .map((i) => i.body ?? i.description ?? i.title);

  const documents = bound
    .filter((i) => i.type === "document")
    .map((i) => ({
      title: i.title,
      summary: i.description ?? (i.fileNames?.join(", ") ?? "Uploaded document"),
    }));

  const connectors = bound
    .filter((i) => i.connectorId && (i.type === "manual" || i.type === "document"))
    .map((i) => {
      const connector = i.connectorId ? CONNECTORS.find((c) => c.id === i.connectorId) : undefined;
      return {
        name: connector?.name ?? i.title,
        lastSync: i.updatedAt.slice(0, 10),
        summary: i.body ?? i.description ?? i.title,
      };
    });

  const evidence = bound
    .filter((i) => i.type === "evidence")
    .map(contextItemToEvidence)
    .filter((e): e is EvidenceSource => e !== null);

  const manualNotes = bound
    .filter((i) => i.type === "manual")
    .map((i) => i.body ?? i.description ?? i.title);

  if (question) {
    manualNotes.unshift(`Question: ${question.preciseDefinition}`);
  }

  return {
    questionId,
    instructions,
    documents,
    connectors,
    evidence,
    manualNotes,
    assembledAt: new Date().toISOString(),
  };
}

export function formatModelContextPreview(bundle: ModelContextBundle): string {
  const sections: string[] = [];
  if (bundle.instructions.length) {
    sections.push("## Instructions\n" + bundle.instructions.join("\n\n"));
  }
  if (bundle.manualNotes.length) {
    sections.push("## Manual context\n" + bundle.manualNotes.join("\n\n"));
  }
  if (bundle.connectors.length) {
    sections.push(
      "## Connectors\n" +
        bundle.connectors.map((c) => `- ${c.name} (${c.lastSync}): ${c.summary}`).join("\n")
    );
  }
  if (bundle.documents.length) {
    sections.push(
      "## Documents\n" + bundle.documents.map((d) => `- ${d.title}: ${d.summary}`).join("\n")
    );
  }
  if (bundle.evidence.length) {
    sections.push(
      "## Evidence\n" +
        bundle.evidence.map((e) => `- ${e.title} [${e.sourceClass}]`).join("\n")
    );
  }
  return sections.join("\n\n") || "No context bound to this forecast.";
}

export function connectorItemForId(connectorId: string, items: ContextItem[]): ContextItem | undefined {
  return items.find((i) => i.type === "connector" && i.connectorId === connectorId && i.status !== "archived");
}

export function touchpointSignalsFromBindings(
  questionId: string,
  items: ContextItem[],
  bindings: ContextBinding[]
): import("./types").TouchpointSignal[] {
  const bound = itemsForQuestion(questionId, items, bindings);
  return bound
    .filter((i) => i.type === "document" || (i.type === "manual" && i.connectorId))
    .map((item) => {
      if (item.type === "document") {
        return {
          kind: "upload" as const,
          label: item.title,
          summary: item.description ?? `${item.fileNames?.length ?? 0} file(s)`,
          updatedAt: item.updatedAt.slice(0, 10),
        };
      }
      const connector = item.connectorId ? CONNECTORS.find((c) => c.id === item.connectorId) : undefined;
      if (connector?.kind) {
        return {
          kind: connector.kind,
          summary: item.body ?? item.description ?? item.title,
          updatedAt: item.updatedAt.slice(0, 10),
        };
      }
      return {
        kind: "custom" as const,
        sourceId: item.connectorId ?? item.id,
        label: connector?.name ?? item.title,
        brandColor: connector?.brandColor ?? "#5b6b66",
        summary: item.body ?? item.description ?? item.title,
        updatedAt: item.updatedAt.slice(0, 10),
      };
    });
}
