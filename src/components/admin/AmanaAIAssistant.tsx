import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Mic, MicOff, Send, Loader2, Maximize2, Minimize2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };
type ChatSize = "normal" | "large" | "fullscreen";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`;

const sizeClasses: Record<ChatSize, string> = {
  normal: "fixed bottom-0 right-0 left-0 sm:left-auto sm:bottom-4 sm:right-4 w-full sm:w-[400px] h-[85vh] sm:h-[520px]",
  large: "fixed bottom-0 right-0 left-0 sm:left-auto sm:bottom-4 sm:right-4 w-full sm:w-[600px] h-[90vh] sm:h-[680px]",
  fullscreen: "fixed inset-0 sm:inset-4",
};

const AmanaAIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState("");
  const [chatSize, setChatSize] = useState<ChatSize>("normal");
  const [wakeWordActive, setWakeWordActive] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const wakeRecognitionRef = useRef<any>(null);
  const openRef = useRef(open);

  useEffect(() => { openRef.current = open; }, [open]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Wake word listener
  useEffect(() => {
    if (!wakeWordActive || open) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    let recognition: any;
    let shouldRestart = true;

    const createRecognition = () => {
      recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim();
          if (
            transcript.includes("hi amana") ||
            transcript.includes("hey amana") ||
            transcript.includes("hello amana") ||
            transcript.includes("hi amanda") ||
            transcript.includes("hey amanda")
          ) {
            shouldRestart = false;
            recognition.stop();
            setOpen(true);
            setMessages((prev) =>
              prev.length === 0
                ? [{ role: "assistant", content: "Hello Admin! 👋 I'm **Amana**, your AI assistant. How can I help you today?" }]
                : prev
            );
            break;
          }
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          console.log("Wake word error:", e.error);
        }
      };

      recognition.onend = () => {
        if (shouldRestart && !openRef.current) {
          setTimeout(() => {
            try { recognition.start(); } catch {}
          }, 300);
        }
      };

      return recognition;
    };

    recognition = createRecognition();
    try { recognition.start(); } catch {}
    wakeRecognitionRef.current = recognition;

    return () => {
      shouldRestart = false;
      try { recognition.stop(); } catch {}
    };
  }, [wakeWordActive, open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInputText("");

    const userMsg: Msg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get response");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Execute action blocks
      if (assistantSoFar.includes("```action")) {
        const actionMatch = assistantSoFar.match(/```action\s*([\s\S]*?)```/);
        if (actionMatch) {
          try {
            const action = JSON.parse(actionMatch[1].trim());
            const { data: { session: s } } = await supabase.auth.getSession();
            const actionResp = await fetch(CHAT_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${s!.access_token}`,
              },
              body: JSON.stringify({ action }),
            });
            const actionResult = await actionResp.json();
            if (actionResult.result?.success) {
              setMessages((prev) => [...prev, {
                role: "assistant",
                content: `✅ **Action completed:** ${actionResult.result.message}`,
              }]);
              toast.success(actionResult.result.message);
            } else {
              setMessages((prev) => [...prev, {
                role: "assistant",
                content: `❌ **Action failed:** ${actionResult.error || "Unknown error"}`,
              }]);
            }
          } catch (e) {
            console.error("Action parse error:", e);
          }
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I encountered an error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  // Voice recording - converts speech to text in the input field
  const startVoiceRecording = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setInputText(finalTranscript || interimTranscript);
    };

    recognition.onerror = (e: any) => {
      console.error("Voice input error:", e.error);
      if (e.error === "not-allowed") {
        toast.error("Microphone permission denied. Please allow microphone access.");
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      // Auto-send if we got text
      setInputText((current) => {
        if (current.trim()) {
          setTimeout(() => {
            const input = document.getElementById("amana-input") as HTMLInputElement;
            if (input?.value.trim()) {
              sendMessage(input.value);
            }
          }, 100);
        }
        return current;
      });
    };

    try {
      recognition.start();
      setIsRecording(true);
      recognitionRef.current = recognition;
    } catch (e: any) {
      toast.error("Could not start microphone. Check browser permissions.");
    }
  }, [sendMessage]);

  const stopVoiceRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const cycleSize = () => {
    setChatSize((prev) => {
      if (prev === "normal") return "large";
      if (prev === "large") return "fullscreen";
      return "normal";
    });
  };

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => {
              setOpen(true);
              if (messages.length === 0) {
                setMessages([{
                  role: "assistant",
                  content: "Hello Admin! 👋 I'm **Amana**, your AI assistant. I can help you manage contributions, loans, investors, and more. Just ask me or tap the 🎤 to speak! You can also say **\"Hi Amana\"** anytime to summon me.",
                }]);
              }
            }}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:shadow-2xl flex items-center justify-center transition-shadow"
          >
            <Bot className="w-6 h-6" />
            {wakeWordActive && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`z-50 bg-card border border-border sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden ${sizeClasses[chatSize]}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold text-sm">Amana AI Assistant</h3>
                  <p className="text-xs opacity-80">
                    {isRecording ? "🎤 Listening..." : "Your admin helper"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Resize button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-white/20"
                  onClick={cycleSize}
                  title={chatSize === "fullscreen" ? "Minimize" : chatSize === "large" ? "Full screen" : "Enlarge"}
                >
                  {chatSize === "fullscreen" ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : chatSize === "large" ? (
                    <Maximize2 className="w-4 h-4" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                </Button>
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-white/20"
                  onClick={() => { setOpen(false); setChatSize("normal"); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
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

            {/* Input */}
            <div className="p-3 border-t border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isRecording
                      ? "bg-destructive text-white animate-pulse"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                  title={isRecording ? "Stop recording" : "Record voice command"}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <input
                  id="amana-input"
                  type="text"
                  placeholder={isRecording ? "🎤 Listening... speak now" : "Type or tap mic to speak..."}
                  className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(inputText)}
                  disabled={isRecording}
                />
                <Button
                  size="icon"
                  className="flex-shrink-0 w-10 h-10 rounded-full"
                  onClick={() => sendMessage(inputText)}
                  disabled={!inputText.trim() || isLoading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {isRecording && (
                <p className="text-xs text-center text-destructive mt-2 animate-pulse">
                  🎤 Recording... tap mic again to stop & send
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AmanaAIAssistant;
