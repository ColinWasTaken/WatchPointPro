import { ReportCard } from "./report-list";
import { MessageBubble } from "./message-bubble";

type ReportItem = {
  id: string;
  createdAt: Date;
  notes: string | null;
  photoUrls: string;
  checklistResults: string;
  status: string;
};

type MessageItem = {
  id: string;
  createdAt: Date;
  content: string;
  senderId: string;
  sender: { name: string | null; email: string };
};

export function UpdatesFeed({
  reports,
  messages,
  currentUserId,
  reportHrefBase,
}: {
  reports: ReportItem[];
  messages: MessageItem[];
  currentUserId: string;
  reportHrefBase?: string;
}) {
  const items = [
    ...reports.map((report) => ({
      kind: "report" as const,
      createdAt: report.createdAt,
      report,
    })),
    ...messages.map((message) => ({
      kind: "message" as const,
      createdAt: message.createdAt,
      message,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (items.length === 0) {
    return <p className="mt-2 text-sm text-ink-muted">No updates yet.</p>;
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {items.map((item) =>
        item.kind === "report" ? (
          <ReportCard
            key={`report-${item.report.id}`}
            report={item.report}
            href={reportHrefBase ? `${reportHrefBase}/${item.report.id}` : undefined}
          />
        ) : (
          <div key={`message-${item.message.id}`} className="flex">
            <MessageBubble
              content={item.message.content}
              createdAt={item.message.createdAt}
              senderName={item.message.sender.name ?? item.message.sender.email}
              isOwn={item.message.senderId === currentUserId}
            />
          </div>
        ),
      )}
    </div>
  );
}
