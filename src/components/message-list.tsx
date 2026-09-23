import { MessageBubble } from "./message-bubble";

type MessageItem = {
  id: string;
  createdAt: Date;
  content: string;
  senderId: string;
  sender: { name: string | null; email: string };
};

export function MessageList({
  messages,
  currentUserId,
}: {
  messages: MessageItem[];
  currentUserId: string;
}) {
  if (messages.length === 0) {
    return <p className="mt-2 text-sm text-ink-muted">No messages yet.</p>;
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          content={message.content}
          createdAt={message.createdAt}
          senderName={message.sender.name ?? message.sender.email}
          isOwn={message.senderId === currentUserId}
        />
      ))}
    </div>
  );
}
