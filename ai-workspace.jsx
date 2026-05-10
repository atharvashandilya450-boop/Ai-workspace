import { useState, useRef, useEffect } from "react";

const AGENTS = [
  {
    id: "manager",
    name: "Manager",
    role: "Team Lead",
    emoji: "🧠",
    color: "#f59e0b",
    accent: "#fef3c7",
    systemPrompt: `You are the Manager AI — a smart team lead who coordinates other AI agents. 
You delegate tasks, synthesize results, and give concise strategic responses.
When a user sends a task, briefly say which agent(s) would handle it and why. 
Keep replies short (2-4 sentences). Be decisive and professional.`,
  },
  {
    id: "coder",
    name: "Dev Bot",
    role: "Software Engineer",
    emoji: "💻",
    color: "#3b82f6",
    accent: "#eff6ff",
    systemPrompt: `You are Dev Bot — an expert software engineer AI agent. 
You write clean, working code and explain technical concepts clearly.
When given a task, provide code snippets, technical solutions, or debugging help.
Keep responses focused and practical. Use markdown code blocks.`,
  },
  {
    id: "researcher",
    name: "Research AI",
    role: "Analyst",
    emoji: "🔍",
    color: "#8b5cf6",
    accent: "#f5f3ff",
    systemPrompt: `You are Research AI — a thorough analyst and researcher.
You find insights, summarize information, and provide well-structured analyses.
When given a task, break it down logically and provide key findings with bullet points.
Be concise but comprehensive. Focus on actionable insights.`,
  },
  {
    id: "creative",
    name: "Creative",
    role: "Designer & Writer",
    emoji: "🎨",
    color: "#ec4899",
    accent: "#fdf2f8",
    systemPrompt: `You are Creative — an imaginative designer and writer AI agent.
You generate creative ideas, write compelling content, and describe visual concepts.
When given a task, think outside the box and present 2-3 creative directions.
Be expressive, vivid, and inspiring in your responses.`,
  },
  {
    id: "planner",
    name: "Planner",
    role: "Project Manager",
    emoji: "📋",
    color: "#10b981",
    accent: "#ecfdf5",
    systemPrompt: `You are Planner — a meticulous project manager AI agent.
You create structured plans, timelines, checklists, and workflows.
When given a task, break it into clear steps with priorities and estimated effort.
Use numbered lists, checkboxes, and clear milestones in your responses.`,
  },
];

const COLLAB_AGENTS = ["coder", "researcher", "creative", "planner"];

async function callClaude(systemPrompt, messages) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || "No response.";
}

export default function AIWorkspace() {
  const [activeAgent, setActiveAgent] = useState("manager");
  const [chats, setChats] = useState({
    manager: [], coder: [], researcher: [], creative: [], planner: [],
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [collabMode, setCollabMode] = useState(false);
  const [collabTask, setCollabTask] = useState("");
  const [collabResults, setCollabResults] = useState([]);
  const [collabLoading, setCollabLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "collab"
  const bottomRef = useRef(null);

  const agent = AGENTS.find((a) => a.id === activeAgent);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeAgent, loading]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const updatedHistory = [...(chats[activeAgent] || []), userMsg];
    setChats((prev) => ({ ...prev, [activeAgent]: updatedHistory }));
    setInput("");
    setLoading(true);
    try {
      const reply = await callClaude(agent.systemPrompt, updatedHistory);
      setChats((prev) => ({
        ...prev,
        [activeAgent]: [...updatedHistory, { role: "assistant", content: reply }],
      }));
    } catch {
      setChats((prev) => ({
        ...prev,
        [activeAgent]: [...updatedHistory, { role: "assistant", content: "⚠️ Error reaching AI. Try again." }],
      }));
    }
    setLoading(false);
  }

  async function runCollab() {
    if (!collabTask.trim() || collabLoading) return;
    setCollabLoading(true);
    setCollabResults([]);
    const agents = AGENTS.filter((a) => COLLAB_AGENTS.includes(a.id));
    const results = [];
    for (const ag of agents) {
      const prompt = `The team has been given this task: "${collabTask}"\nAs ${ag.name} (${ag.role}), provide your contribution to completing this task. Be concise and focused on your specialty.`;
      try {
        const reply = await callClaude(ag.systemPrompt, [{ role: "user", content: prompt }]);
        results.push({ agent: ag, reply });
        setCollabResults([...results]);
      } catch {
        results.push({ agent: ag, reply: "⚠️ Error." });
        setCollabResults([...results]);
      }
    }
    // Manager synthesizes
    const managerAgent = AGENTS.find((a) => a.id === "manager");
    const synthesis = results.map((r) => `${r.agent.name}: ${r.reply}`).join("\n\n");
    const managerPrompt = `Your team completed a task: "${collabTask}"\n\nHere are their contributions:\n${synthesis}\n\nAs Manager, give a brief 3-sentence synthesis and final recommendation.`;
    try {
      const managerReply = await callClaude(managerAgent.systemPrompt, [{ role: "user", content: managerPrompt }]);
      results.push({ agent: managerAgent, reply: managerReply, isSummary: true });
      setCollabResults([...results]);
    } catch {}
    setCollabLoading(false);
  }

  const messages = chats[activeAgent] || [];

  return (
    <div style={{
      fontFamily: "'Sora', 'Segoe UI', sans-serif",
      background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      minHeight: "100vh",
      color: "#f1f5f9",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #f59e0b, #ec4899)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>⚡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>AI Team Workspace</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{AGENTS.length} agents ready</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {["chat", "collab"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, letterSpacing: "0.3px",
                background: activeTab === tab ? "linear-gradient(135deg, #f59e0b, #ec4899)" : "rgba(255,255,255,0.08)",
                color: activeTab === tab ? "#fff" : "#94a3b8",
                transition: "all 0.2s",
              }}>
                {tab === "chat" ? "💬 Chat" : "🤝 Collab"}
              </button>
            ))}
          </div>
        </div>

        {/* Agent selector */}
        {activeTab === "chat" && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {AGENTS.map((ag) => (
              <button key={ag.id} onClick={() => setActiveAgent(ag.id)} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "8px 14px", borderRadius: 14, border: "none", cursor: "pointer",
                background: activeAgent === ag.id
                  ? `linear-gradient(135deg, ${ag.color}33, ${ag.color}55)`
                  : "rgba(255,255,255,0.06)",
                outline: activeAgent === ag.id ? `2px solid ${ag.color}` : "2px solid transparent",
                transition: "all 0.2s", minWidth: 72, flexShrink: 0,
              }}>
                <span style={{ fontSize: 20 }}>{ag.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: activeAgent === ag.id ? ag.color : "#94a3b8", marginTop: 3 }}>
                  {ag.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === "chat" ? (
        <>
          {/* Agent info bar */}
          <div style={{
            padding: "10px 20px",
            background: `linear-gradient(90deg, ${agent.color}15, transparent)`,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `linear-gradient(135deg, ${agent.color}88, ${agent.color}44)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              border: `2px solid ${agent.color}66`,
            }}>{agent.emoji}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: agent.color }}>{agent.name}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{agent.role} • Online</div>
            </div>
            <div style={{
              marginLeft: "auto", width: 8, height: 8, borderRadius: "50%",
              background: "#22c55e", boxShadow: "0 0 6px #22c55e",
            }} />
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 && (
              <div style={{
                textAlign: "center", marginTop: 40, color: "#475569",
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{agent.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#64748b" }}>Start chatting with {agent.name}</div>
                <div style={{ fontSize: 13, marginTop: 6, color: "#334155" }}>{agent.role} is ready to help</div>
                <div style={{
                  marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center",
                }}>
                  {[
                    agent.id === "coder" ? "Write a React component" :
                    agent.id === "researcher" ? "Analyze market trends" :
                    agent.id === "creative" ? "Design a mobile app" :
                    agent.id === "planner" ? "Plan a product launch" :
                    "Assign a task to the team",
                    "How can you help me?",
                  ].map((s) => (
                    <button key={s} onClick={() => setInput(s)} style={{
                      padding: "7px 14px", borderRadius: 20, border: `1px solid ${agent.color}44`,
                      background: `${agent.color}11`, color: agent.color, fontSize: 12,
                      cursor: "pointer", fontWeight: 500,
                    }}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 10, alignItems: "flex-start",
              }}>
                {m.role === "assistant" && (
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${agent.color}88, ${agent.color}44)`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                  }}>{agent.emoji}</div>
                )}
                <div style={{
                  maxWidth: "78%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: m.role === "user"
                    ? `linear-gradient(135deg, ${agent.color}cc, ${agent.color}99)`
                    : "rgba(255,255,255,0.07)",
                  backdropFilter: "blur(8px)",
                  border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
                  fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: `linear-gradient(135deg, ${agent.color}88, ${agent.color}44)`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>{agent.emoji}</div>
                <div style={{
                  padding: "10px 16px", borderRadius: "16px 16px 16px 4px",
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", gap: 5, alignItems: "center",
                }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: "50%", background: agent.color,
                      animation: `bounce 1s ${i * 0.15}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "12px 16px 16px",
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={`Message ${agent.name}...`}
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 14,
                  border: `1px solid ${agent.color}44`,
                  background: "rgba(255,255,255,0.06)", color: "#f1f5f9",
                  fontSize: 14, outline: "none",
                }}
              />
              <button onClick={sendMessage} disabled={loading || !input.trim()} style={{
                width: 46, height: 46, borderRadius: 14, border: "none", cursor: "pointer",
                background: loading || !input.trim() ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg, ${agent.color}, ${agent.color}bb)`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                transition: "all 0.2s",
              }}>➤</button>
            </div>
          </div>
        </>
      ) : (
        /* Collab Tab */
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.08)", padding: 16,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#f59e0b" }}>
              🤝 Team Collaboration — All Agents Work Together
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
              Give a big task and every agent contributes their specialty, then the Manager synthesizes.
            </div>
            <textarea
              value={collabTask}
              onChange={(e) => setCollabTask(e.target.value)}
              placeholder="e.g. Build a social media app for fitness tracking..."
              rows={3}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)", color: "#f1f5f9",
                fontSize: 13, resize: "vertical", outline: "none",
                fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
            <button onClick={runCollab} disabled={collabLoading || !collabTask.trim()} style={{
              marginTop: 10, width: "100%", padding: "12px",
              borderRadius: 12, border: "none", cursor: "pointer",
              background: collabLoading || !collabTask.trim()
                ? "rgba(255,255,255,0.08)"
                : "linear-gradient(135deg, #f59e0b, #ec4899)",
              color: "#fff", fontWeight: 700, fontSize: 14,
              transition: "all 0.2s",
            }}>
              {collabLoading ? "⏳ Team Working..." : "🚀 Deploy All Agents"}
            </button>
          </div>

          {/* Collab results */}
          {collabResults.map((r, i) => (
            <div key={i} style={{
              background: r.isSummary
                ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(236,72,153,0.1))"
                : "rgba(255,255,255,0.04)",
              borderRadius: 16, border: r.isSummary
                ? "1px solid rgba(245,158,11,0.4)"
                : `1px solid ${r.agent.color}33`,
              padding: 14,
              animation: "fadeIn 0.4s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `linear-gradient(135deg, ${r.agent.color}88, ${r.agent.color}44)`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>{r.agent.emoji}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: r.agent.color }}>{r.agent.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{r.isSummary ? "Final Synthesis" : r.agent.role}</div>
                </div>
                {r.isSummary && <div style={{ marginLeft: "auto", fontSize: 18 }}>⭐</div>}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                {r.reply}
              </div>
            </div>
          ))}

          {collabLoading && collabResults.length < COLLAB_AGENTS.length + 1 && (
            <div style={{ textAlign: "center", color: "#64748b", fontSize: 13, padding: 16 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚙️</div>
              Agents are collaborating...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        input::placeholder { color: #475569; }
        textarea::placeholder { color: #475569; }
      `}</style>
    </div>
  );
}
