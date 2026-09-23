import { LocalTime } from "./local-time";

export function MessageBubble({
  content,
  createdAt,
  senderName,
  isOwn,
}: {
  content: string;
  createdAt: Date;
  senderName: string;
  isOwn: boolean;
}) {
  return (
    <div
      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
        isOwn ? "ml-auto bg-accent text-white" : "bg-surface text-ink"
      }`}
    >
      {!isOwn && (
        <p className="mb-0.5 text-xs font-semibold text-accent">{senderName}</p>
      )}
      <p className="whitespace-pre-wrap">{content}</p>
      <p className={`mt-1 text-[10px] ${isOwn ? "text-white/70" : "text-ink-muted"}`}>
        <LocalTime iso={new Date(createdAt).toISOString()} />
      </p>
    </div>
  );
}
