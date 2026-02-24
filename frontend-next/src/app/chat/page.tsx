"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/Toast";
import { getToken, getUsername } from "@/lib/api";
import { useRouter } from "next/navigation";

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

  useEffect(() => {
    const t = getToken();
    if (!t) { router.replace("/auth"); return; }
    setToken(t);
    setUsernameState(getUsername());
    loadConversations(t);
    loadContacts(t);
  }, [router]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages in active conversation
  useEffect(() => {
    if (!selectedConv || !token) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      loadMessages(selectedConv.id, token);
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedConv, token]);

  const loadConversations = async (t: string) => {
    try {
      const res = await fetch(`${API}/chat/conversations`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) { router.replace("/auth"); return; }
      setConversations(await res.json());
    } catch { /* silently fail if backend not running */ }
  };

  const loadContacts = async (t: string) => {
    try {
      const res = await fetch(`${API}/chat/contacts`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) setContacts(await res.json());
    } catch { /* ignore */ }
  };

  const loadMessages = useCallback(async (convId: number, t: string) => {
    try {
      const res = await fetch(`${API}/chat/conversations/${convId}/messages`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) setMessages(await res.json());
    } catch { /* ignore */ }
  }, []);

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
    // Find existing conversation or create one by sending a message
    const existing = conversations.find((c) => c.peer.id === contact.id);
    if (existing) {
      selectConversation(existing);
      setShowContacts(false);
    } else {
      // Will create conversation on first message
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

  function fmtTime(unix: number) {
    return new Date(unix * 1000).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!token) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      {ToastComponent}

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Chat</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Encrypted messaging with your contacts
          </p>
        </div>

        <div className="flex gap-5 h-[600px]">
          {/* Sidebar */}
          <div className="w-72 flex-shrink-0 glass-card flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-[var(--color-border)]/50">
              <button
                onClick={() => setShowContacts(false)}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  !showContacts ? "text-white border-b-2 border-[var(--color-primary)]" : "text-[var(--color-text-dim)]"
                }`}
              >
                Conversations
              </button>
              <button
                onClick={() => setShowContacts(true)}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  showContacts ? "text-white border-b-2 border-[var(--color-primary)]" : "text-[var(--color-text-dim)]"
                }`}
              >
                Contacts
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {showContacts ? (
                <div className="p-4 space-y-3">
                  {/* Add contact */}
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-background)]/80 border border-[var(--color-border)] text-xs text-white outline-none focus:border-[var(--color-primary)]"
                      placeholder="Add by username"
                      value={addContactName}
                      onChange={(e) => setAddContactName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addContact()}
                    />
                    <button
                      onClick={addContact}
                      className="px-3 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold"
                    >
                      +
                    </button>
                  </div>

                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--color-surface-hover)]/50 transition-colors"
                    >
                      <button
                        onClick={() => startChat(c)}
                        className="text-left flex-1"
                      >
                        <span className="text-sm font-medium">{c.username}</span>
                      </button>
                      <button
                        onClick={() => removeContact(c.id)}
                        className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-danger)] p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {contacts.length === 0 && (
                    <p className="text-xs text-[var(--color-text-dim)] text-center py-8">
                      No contacts yet. Add one by username above.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${
                        selectedConv?.peer.id === conv.peer.id
                          ? "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20"
                          : "hover:bg-[var(--color-surface-hover)]/50"
                      }`}
                    >
                      <div className="text-sm font-semibold">{conv.peer.username}</div>
                      {conv.lastMessage && (
                        <div className="text-xs text-[var(--color-text-dim)] truncate mt-0.5">
                          {conv.lastMessage.slice(0, 40)}
                        </div>
                      )}
                    </button>
                  ))}

                  {conversations.length === 0 && (
                    <p className="text-xs text-[var(--color-text-dim)] text-center py-8 px-4">
                      No conversations yet. Add a contact and start chatting.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 glass-card flex flex-col overflow-hidden">
            {selectedConv ? (
              <>
                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--color-border)]/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-xs font-bold text-white">
                    {selectedConv.peer.username[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold">{selectedConv.peer.username}</span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
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
                    <input
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-background)]/80 border border-[var(--color-border)] text-sm text-white outline-none focus:border-[var(--color-primary)] transition-colors"
                      placeholder="Type a message..."
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMsg.trim() || sending}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white text-sm font-semibold disabled:opacity-50 transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center px-8">
                <div>
                  <div className="text-5xl mb-4">💬</div>
                  <h3 className="text-lg font-bold mb-2">Select a conversation</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Choose a contact or conversation from the sidebar to start chatting.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
