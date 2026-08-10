import {
  ArrowUpDown,
  Bell,
  Clock3,
  Ellipsis,
  ExternalLink,
  FileText,
  Filter,
  Layers3,
  Lock,
  Mail,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Trash2,
} from "lucide-react";

export function IconDots() {
  return <Ellipsis size={14} />;
}
export function IconPin({ filled = false }: { filled?: boolean }) {
  return <Pin size={14} fill={filled ? "currentColor" : "none"} />;
}
export function IconLock() {
  return <Lock size={12} />;
}
export function IconShare() {
  return <Share2 size={14} />;
}
export function IconRefresh() {
  return <RefreshCw size={14} strokeWidth={2.2} />;
}
export function IconPlus() {
  return <Plus size={14} strokeWidth={2.5} />;
}
export function IconSearch() {
  return <Search size={16} />;
}
export function IconFilter() {
  return <Filter size={14} />;
}
export function IconSort() {
  return <ArrowUpDown size={14} />;
}
export function IconBell() {
  return <Bell size={14} />;
}
export function IconTrash() {
  return <Trash2 size={14} />;
}
export function IconDocument() {
  return <FileText size={16} />;
}
export function IconClock() {
  return <Clock3 size={16} />;
}
export function IconLayers() {
  return <Layers3 size={16} />;
}
export function IconMail() {
  return <Mail size={14} />;
}
export function IconExternalLink() {
  return <ExternalLink size={12} strokeWidth={2.2} />;
}
