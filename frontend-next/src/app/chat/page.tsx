"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Users,
  Send,
  UserPlus,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, Button, Input, EmptyState } from "@/components/ui";
import { getToken, getUsername } from "@/lib/api";
import { useToast } from "@/components/Toast";

const API = "http://localhost:8080";

interface Contact {
  id: number;
  username: string;
  public_key: string | null;
}

interface Conversation {
  id: number;
  peer: { id: number; username: string };
  lastMessage: string | null;
  lastType: string | null;
  lastAt: number | null;
}

interface Message {
  id: number;
  sender_id: number;
  sender_username: string;
  type: string;
  body: string;
  created_at: number;
}

function fmtTime(unix: number) {
  return new Date(unix * 1000).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsernameState] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [addContactName, setAddContactName] = useState("");
  const [sending, setSending] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const { showToast, ToastComponent } = useToast();
  const msgEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const loadConversations = useCallback(async (t: string) => {
    try {
      const res = await fetch(`${API}/chat/conversations`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) { router.replace("/auth"); return; }
      setConversations(await res.json());
    } catch { /* silently fail */ }
  }, [router]);

  const loadContacts = useCallback(async (t: string) => {
    try {
      const res = await fetch(`${API}/chat/contacts`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) setContacts(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadMessages = useCallback(async (convId: number, t: string) => {
    try {
      const res = await fetch(`${API}/chat/conversations/${convId}/messages`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) setMessages(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const t = getToken();
    if (!t) { router.replace("/auth"); return; }
    setToken(t);
    setUsernameState(getUsername());
    loadConversations(t);
    loadContacts(t);
  }, [router, loadConversations, loadContacts]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedConv || !token) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      loadMessages(selectedConv.id, token);
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedConv, token, loadMessages]);

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    if (token) loadMessages(conv.id, token);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedConv || !token) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/chat/conversations/${selectedConv.peer.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "text", body: newMsg.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setNewMsg("");
        loadConversations(token);
      }
    } catch {
      showToast("Failed to send message", "error");
    }
    setSending(false);
  };

  const addContact = async () => {
    if (!addContactName.trim() || !token) return;
    try {
      const res = await fetch(`${API}/chat/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: addContactName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setContacts((prev) => [...prev, data as Contact]);
        setAddContactName("");
        showToast(`Added ${data.username}`, "success");
      } else {
        showToast(data.error || "Failed to add contact", "error");
      }
    } catch {
      showToast("Connection failed", "error");
    }
  };

  const startChat = (contact: Contact) => {
    const existing = conversations.find((c) => c.peer.id === contact.id);
    if (existing) {
      selectConversation(existing);
      setShowContacts(false);
    } else {
      setSelectedConv({
        id: -1,
        peer: { id: contact.id, username: contact.username },
        lastMessage: null,
        lastType: null,
        lastAt: null,
      });
      setMessages([]);
      setShowContacts(false);
    }
  };

  const removeContact = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`${API}/chat/contacts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts((prev) => prev.filter((c) => c.id !== id));
      showToast("Contact removed", "info");
    } catch { /* ignore */ }
  };

  if (!token) return null;

  return (
    <DashboardLayout title="Chat" description="Encrypted messaging with your contacts">
      {ToastComponent}

      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Sidebar */}
        <Card padding="none" className="w-80 flex-shrink-0 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[var(--color-border)]/50">
            <button
              onClick={() => setShowContacts(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                !showContacts
                  ? "text-white border-b-2 border-[var(--color-primary)]"
                  : "text-[var(--color-text-dim)] hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Chats
            </button>
            <button
              onClick={() => setShowContacts(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                showContacts
                  ? "text-white border-b-2 border-[var(--color-primary)]"
                  : "text-[var(--color-text-dim)] hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              Contacts
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {showContacts ? (
              <div className="p-4 space-y-3">
                {/* Add contact */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add by username"
                    value={addContactName}
                    onChange={(e) => setAddContactName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addContact()}
                    className="flex-1"
                  />
                  <Button
                    onClick={addContact}
                    icon={<UserPlus className="w-4 h-4" />}
                    disabled={!addContactName.trim()}
                  />
                </div>

                {contacts.length === 0 ? (
                  <EmptyState
                    icon={<Users className="w-6 h-6" />}
                    title="No contacts"
                    description="Add someone by their username"
                  />
                ) : (
                  contacts.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-hover)]/50 transition-colors"
                    >
                      <button
                        onClick={() => startChat(c)}
                        className="text-left flex-1 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-xs font-bold text-white">
                          {c.username[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{c.username}</span>
                      </button>
                      <button
                        onClick={() => removeContact(c.id)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-danger)]/10 text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="p-2">
                {conversations.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      icon={<MessageSquare className="w-6 h-6" />}
                      title="No conversations"
                      description="Add a contact and start chatting"
                    />
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${
                        selectedConv?.peer.id === conv.peer.id
                          ? "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20"
                          : "hover:bg-[var(--color-surface-hover)]/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-sm font-bold text-white">
                          {conv.peer.username[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold">{conv.peer.username}</div>
                          {conv.lastMessage && (
                            <div className="text-xs text-[var(--color-text-dim)] truncate mt-0.5">
                              {conv.lastMessage.slice(0, 40)}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Chat area */}
        <Card padding="none" className="flex-1 flex flex-col overflow-hidden">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-[var(--color-border)]/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-sm font-bold text-white">
                  {selectedConv.peer.username[0].toUpperCase()}
                </div>
                <div>
                  <span className="text-sm font-semibold">{selectedConv.peer.username}</span>
                  <p className="text-xs text-[var(--color-text-dim)]">Encrypted chat</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <p className="text-sm text-[var(--color-text-dim)]">
                      Start a conversation with {selectedConv.peer.username}
                    </p>
                  </div>
                )}
                {messages.map((msg) => {
                  const isMe = msg.sender_username === username;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                          isMe
                            ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-br-sm"
                            : "bg-[var(--color-surface-hover)] text-[var(--color-text)] rounded-bl-sm"
                        }`}
                      >
                        <p className="leading-relaxed">{msg.body}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? "text-white/60" : "text-[var(--color-text-dim)]"}`}>
                          {fmtTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={msgEndRef} />
              </div>

              {/* Input */}
              <div className="px-6 py-4 border-t border-[var(--color-border)]/50">
                <div className="flex gap-3">
                  <Input
                    placeholder="Type a message..."
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMsg.trim() || sending}
                    loading={sending}
                    icon={<Send className="w-4 h-4" />}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<MessageSquare className="w-8 h-8" />}
              title="Select a conversation"
              description="Choose a contact or conversation from the sidebar to start chatting."
              className="flex-1"
            />
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
