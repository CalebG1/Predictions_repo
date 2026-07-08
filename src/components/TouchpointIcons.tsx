import { useState, type CSSProperties, type MouseEvent } from "react";
import type { TouchpointSignal, Visibility } from "../domain/types";
import { touchpointMeta } from "../domain/touchpoints";
import { useStore } from "../store";
import { IconPlus } from "./icons";
import { SourceMark } from "./brandIcons";
import AddSourceModal from "./AddSourceModal";

function signalLabel(signal: TouchpointSignal): string {
  return signal.label ?? touchpointMeta(signal.kind)?.label ?? "Source";
}

function signalColor(signal: TouchpointSignal): string {
  return signal.brandColor ?? touchpointMeta(signal.kind)?.brandColor ?? "#5b6b66";
}

function signalKey(signal: TouchpointSignal): string {
  return signal.sourceId ?? signal.kind;
}

export default function TouchpointIcons({
  questionId,
  signals,
  maxVisible,
}: {
  questionId: string;
  signals: TouchpointSignal[];
  maxVisible?: number;
}) {
  const { contextItems, bindingsFor, bindContext, addAppContext, addUpload, addContextItem } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const overflow = maxVisible != null && signals.length > maxVisible ? signals.length - maxVisible : 0;
  const visible = overflow > 0 ? signals.slice(0, maxVisible) : signals;
  const hidden = overflow > 0 ? signals.slice(maxVisible) : [];
  const boundItemIds = new Set(bindingsFor(questionId).map((b) => b.contextItemId));

  const stopNav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const openModal = () => setModalOpen(true);

  return (
    <div className="qc-touchpoints" onClick={stopNav} onMouseDown={stopNav}>
      {visible.map((signal) => {
        const label = signalLabel(signal);
        const color = signalColor(signal);
        return (
          <span
            key={signalKey(signal)}
            className="qc-tp connected"
            style={{ "--tp-color": color } as CSSProperties}
            title={`${label} · ${signal.summary}`}
            aria-label={`${label}: ${signal.summary}`}
          >
            <SourceMark
              kind={signal.kind}
              mono={label.slice(0, 1).toUpperCase()}
              brandColor={color}
            />
          </span>
        );
      })}

      {overflow > 0 && (
        <button
          type="button"
          className="qc-tp qc-tp-overflow"
          title={hidden.map((s) => signalLabel(s)).join(", ")}
          aria-label={`${overflow} more sources: ${hidden.map((s) => signalLabel(s)).join(", ")}`}
          onClick={openModal}
        >
          +{overflow}
        </button>
      )}

      <button
        type="button"
        className="qc-tp qc-tp-add-btn"
        title="Add context"
        aria-label="Add context"
        onClick={openModal}
      >
        <IconPlus />
      </button>

      <AddSourceModal
        open={modalOpen}
        libraryItems={contextItems}
        boundItemIds={boundItemIds}
        onClose={() => setModalOpen(false)}
        onAddAppContext={(connector, data) => {
          addAppContext(
            {
              connectorId: connector.id,
              title: data.title,
              body: data.body,
              sourceRef: data.sourceRef,
              visibility: data.visibility as Visibility,
              tags: data.tags,
            },
            questionId
          );
        }}
        onImport={(fileNames) => addUpload(questionId, fileNames)}
        onNotes={(data) => {
          const item = addContextItem({ type: "manual", ...data });
          bindContext(questionId, item.id);
        }}
        onBindFromLibrary={(itemId) => bindContext(questionId, itemId)}
      />
    </div>
  );
}
