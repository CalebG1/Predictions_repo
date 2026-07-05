import { useState, type CSSProperties, type MouseEvent } from "react";
import type { TouchpointSignal } from "../domain/types";
import type { Connector } from "../domain/connectors";
import { touchpointMeta } from "../domain/touchpoints";
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
  signals,
  onConnect,
  onImport,
  maxVisible,
}: {
  signals: TouchpointSignal[];
  onConnect: (connector: Connector) => void;
  onImport: (fileNames: string[]) => void;
  /** When set, only the first N sources are shown; the rest collapse into a +N chip. */
  maxVisible?: number;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const overflow = maxVisible != null && signals.length > maxVisible ? signals.length - maxVisible : 0;
  const visible = overflow > 0 ? signals.slice(0, maxVisible) : signals;
  const hidden = overflow > 0 ? signals.slice(maxVisible) : [];

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
            className={`qc-tp connected`}
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
        title="Add source"
        aria-label="Add source"
        onClick={openModal}
      >
        <IconPlus />
      </button>

      <AddSourceModal
        open={modalOpen}
        signals={signals}
        onClose={() => setModalOpen(false)}
        onConnect={onConnect}
        onImport={(fileNames) => {
          onImport(fileNames);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
