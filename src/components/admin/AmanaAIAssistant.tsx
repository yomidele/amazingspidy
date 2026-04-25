import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Mic, MicOff, Send, Loader2, Maximize2, Minimize2, Square, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Proposal = { tool: string; args: Record<string, any>; summary: string };
type Msg = {
  role: "user" | "assistant";
  content: string;
  proposal?: Proposal;
  proposalState?: "pending" | "running" | "done" | "cancelled" | "failed";
  proposalResult?: string;
};
type ChatSize = "normal" | "large" | "fullscreen";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`;

const sizeClasses: Record<ChatSize, string> = {
  normal: "fixed bottom-0 right-0 left-0 sm:left-auto sm:bottom-4 sm:right-4 w-full sm:w-[400px] h-[85vh] sm:h-[560px]",
  large: "fixed bottom-0 right-0 left-0 sm:left-auto sm:bottom-4 sm:right-4 w-full sm:w-[600px] h-[90vh] sm:h-[680px]",
  fullscreen: "fixed inset-0 sm:inset-4",
};

const AmanaAIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState("");
  const [chatSize, setChatSize] = useState<ChatSize>("normal");
  const [wakeWordActive] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const wakeRecognitionRef = useRef<any>(null);
  const openRef = useRef(open);

  useEffect(() => { openRef.current = open; }, [open]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  // Wake word listener
  useEffect(() => {
    if (!wakeWordActive || open) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    let recognition: any;
    let shouldRestart = true;
    const create = () => {
      recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript.toLowerCase().trim();
          if (t.includes("hi amana") || t.includes("hey amana") || t.includes("hello amana") || t.includes("hi amanda") || t.includes("hey amanda")) {
            shouldRestart = false;
            recognition.stop();
            setOpen(true);
            setMessages((prev) => prev.length === 0
              ? [{ role: "assistant", content: "Hello Admin! 👋 I'm **Amana**. Ask me anything, or tell me what to do — I'll propose actions for you to confirm." }]
              : prev);
            break;
          }
        }
      };
      recognition.onerror = (e: any) => {
        if (e.error !== "no-speech" && e.error !== "aborted") console.log("Wake word error:", e.error);
      };
      recognition.onend = () => {
        if (shouldRestart && !openRef.current) setTimeout(() => { try { recognition.start(); } catch {} }, 300);
      };
      return recognition;
    };
    recognition = create();
    try { recognition.start(); } catch {}
    wakeRecognitionRef.current = recognition;
    return () => { shouldRestart = false; try { recognition.stop(); } catch {} };
  }, [wakeWordActive, open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInputText("");
    const userMsg: Msg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Strip proposal/state metadata before sending to backend
      const wireMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: wireMessages }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Failed to get response");

      const assistant: Msg = {
        role: "assistant",
        content: data.reply || (data.proposal ? `I'd like to **${data.proposal.summary}**.` : "Done."),
        proposal: data.proposal || undefined,
        proposalState: data.proposal ? "pending" : undefined,
      };
      setMessages((prev) => [...prev, assistant]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I encountered an error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const confirmProposal = useCallback(async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg?.proposal) return;
    setMessages((prev) => prev.map((m, i) => i === msgIndex ? { ...m, proposalState: "running" } : m));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ execute: true, proposal: msg.proposal }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        setMessages((prev) => prev.map((m, i) => i === msgIndex
          ? { ...m, proposalState: "failed", proposalResult: data.message || "Execution failed" }
          : m));
        toast.error(data.message || "Action failed");
        return;
      }
      setMessages((prev) => prev.map((m, i) => i === msgIndex
        ? { ...m, proposalState: "done", proposalResult: data.message }
        : m));
      toast.success("Action completed");
    } catch (e: any) {
      setMessages((prev) => prev.map((m, i) => i === msgIndex
        ? { ...m, proposalState: "failed", proposalResult: e.message }
        : m));
      toast.error(e.message);
    }
  }, [messages]);

  const cancelProposal = (msgIndex: number) => {
    setMessages((prev) => prev.map((m, i) => i === msgIndex ? { ...m, proposalState: "cancelled" } : m));
  };

  // Voice recording
  const startVoiceRecording = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Speech recognition not supported in this browser"); return; }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      let finalT = "", interimT = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalT += event.results[i][0].transcript;
        else interimT += event.results[i][0].transcript;
      }
      setInputText(finalT || interimT);
    };
    recognition.onerror = (e: any) => {
      if (e.error === "not-allowed") toast.error("Microphone permission denied.");
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
      setInputText((current) => {
        if (current.trim()) {
          setTimeout(() => {
            const input = document.getElementById("amana-input") as HTMLInputElement;
            if (input?.value.trim()) sendMessage(input.value);
          }, 100);
        }
        return current;
      });
    };
    try { recognition.start(); setIsRecording(true); recognitionRef.current = recognition; }
    catch { toast.error("Could not start microphone."); }
  }, [sendMessage]);

  const stopVoiceRecording = () => { recognitionRef.current?.stop(); setIsRecording(false); };

  const cycleSize = () => setChatSize((p) => p === "normal" ? "large" : p === "large" ? "fullscreen" : "normal");

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2"
          >
            {wakeWordActive && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="hidden sm:inline-flex items-center gap-1.5 bg-card border border-border text-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-md"
              >
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                Say <span className="font-semibold text-primary">"Hi Amana"</span>
              </motion.span>
            )}
            <button
              onClick={() => {
                setOpen(true);
                if (messages.length === 0) {
                  setMessages([{
                    role: "assistant",
                    content: "Hello Admin! 👋 I'm **Amana**. Ask me anything about the dashboard, or tell me what to do — I'll propose an action and you confirm before I run it.\n\nTry: *\"Change the May 2026 beneficiary in Group A to Oluwadara\"* or *\"Advance Group A to next month\"*.",
                  }]);
                }
              }}
              aria-label='Open Amana AI assistant — say "Hi Amana"'
              title='Say "Hi Amana" to activate'
              className="relative w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:shadow-2xl flex items-center justify-center transition-shadow"
            >
              <Bot className="w-6 h-6" />
              {wakeWordActive && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`z-50 bg-card border border-border sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden ${sizeClasses[chatSize]}`}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold text-sm">Amana AI Assistant</h3>
                  <p className="text-xs opacity-80">{isRecording ? "🎤 Listening..." : "Plans & runs admin actions"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/20" onClick={cycleSize}>
                  {chatSize === "fullscreen" ? <Minimize2 className="w-4 h-4" /> : chatSize === "large" ? <Maximize2 className="w-4 h-4" /> : <Square className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/20" onClick={() => { setOpen(false); setChatSize("normal"); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] space-y-2 ${msg.role === "user" ? "" : "w-full"}`}>
                    <div className={`rounded-2xl px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md inline-block"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>

                    {/* Proposal card */}
                    {msg.proposal && (
                      <div className={`rounded-xl border p-3 space-y-2 text-xs ${
                        msg.proposalState === "done" ? "border-accent/50 bg-accent/5" :
                        msg.proposalState === "failed" ? "border-destructive/50 bg-destructive/5" :
                        msg.proposalState === "cancelled" ? "border-border bg-muted/40 opacity-60" :
                        "border-primary/40 bg-primary/5"
                      }`}>
                        <div className="flex items-center gap-2">
                          {msg.proposalState === "done" ? <CheckCircle2 className="w-4 h-4 text-accent-foreground" /> :
                           msg.proposalState === "failed" ? <AlertTriangle className="w-4 h-4 text-destructive" /> :
                           <Bot className="w-4 h-4 text-primary" />}
                          <span className="font-semibold text-foreground">Proposed action</span>
                        </div>
                        <p className="text-foreground">{msg.proposal.summary}</p>
                        {msg.proposalResult && (
                          <p className={`text-[11px] ${msg.proposalState === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
                            {msg.proposalResult}
                          </p>
                        )}
                        {(!msg.proposalState || msg.proposalState === "pending") && (
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" className="h-7 text-xs" onClick={() => confirmProposal(i)}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm & run
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => cancelProposal(i)}>
                              <X className="w-3.5 h-3.5 mr-1" /> Cancel
                            </Button>
                          </div>
                        )}
                        {msg.proposalState === "running" && (
                          <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isRecording ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                  title={isRecording ? "Stop recording" : "Record voice command"}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <input
                  id="amana-input"
                  type="text"
                  placeholder={isRecording ? "🎤 Listening... speak now" : "Ask or instruct Amana..."}
                  className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(inputText)}
                  disabled={isRecording}
                />
                <Button size="icon" className="flex-shrink-0 w-10 h-10 rounded-full" onClick={() => sendMessage(inputText)} disabled={!inputText.trim() || isLoading}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AmanaAIAssistant;
