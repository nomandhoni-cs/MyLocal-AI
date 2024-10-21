import React, { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
// import "./style.css";

const SidePanel: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [session, setSession] = useState<any>(null);
  const [stats, setStats] = useState({
    maxTokens: 0,
    temperature: 0,
    tokensLeft: 0,
    tokensSoFar: 0,
    topK: 0,
  });
  const [cost, setCost] = useState(0);
  const [error, setError] = useState("");
  const [rawResponse, setRawResponse] = useState("");
  
  const sessionTopKRef = useRef<HTMLInputElement>(null);
  const sessionTemperatureRef = useRef<HTMLInputElement>(null);
  const responseAreaRef = useRef<HTMLDivElement>(null);

  const updateSession = async () => {
    const temperature = Number(sessionTemperatureRef.current?.value || 0);
    const topK = Number(sessionTopKRef.current?.value || 0);
    const newSession = await self.ai.languageModel.create({ temperature, topK });
    setSession(newSession);
    updateStats(newSession);
  };

  const updateStats = (newSession: any) => {
    if (!newSession) return;
    const { maxTokens, temperature, tokensLeft, tokensSoFar, topK } = newSession;
    setStats({ maxTokens, temperature, tokensLeft, tokensSoFar, topK });
  };

  const resetUI = () => {
    setResponse("");
    setRawResponse("");
    setCost(0);
    setStats({
      maxTokens: 0,
      temperature: 0,
      tokensLeft: 0,
      tokensSoFar: 0,
      topK: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await promptModel();
    setPrompt("")
  };

  const promptModel = async () => {
    const promptText = prompt.trim();
    if (!promptText) return;

    let fullResponse = "Generating response...";
    setResponse(fullResponse);
    
    if (!session) {
      await updateSession();
    }

    try {
      const stream = await session.promptStreaming(promptText);
      for await (const chunk of stream) {
        fullResponse = chunk.trim();
        const sanitizedResponse = DOMPurify.sanitize(marked.parse(fullResponse));
        setResponse(sanitizedResponse);
        setRawResponse(fullResponse);
      }
    } catch (error) {
      setResponse(`Error: ${error.message}`);
    } finally {
      updateStats(session);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  useEffect(() => {
    // On component mount, update session if needed
    if (!session) {
      updateSession();
    }
  }, [session]);

  return (
    <div>
      <div id="error-message">{error}</div>
      <div id="prompt-area">
        <form onSubmit={handleSubmit}>
          <label>
            Prompt
            <textarea id="prompt-input" value={prompt} onChange={handleInputChange} />
          </label>
          <button type="submit" id="submit-button">
            Submit prompt
          </button>
          <button type="button" id="reset-button" onClick={resetUI}>
            Reset session
          </button>
          <span id="cost">{cost} tokens</span>
          <div className="settings">
            <label htmlFor="session-top-k">Top-k</label>
            <input id="session-top-k" min={1} type="number" ref={sessionTopKRef} />
            <label htmlFor="session-temperature">Temperature</label>
            <input
              id="session-temperature"
              type="number"
              step="any"
              min={0}
              ref={sessionTemperatureRef}
            />
          </div>
        </form>
        <h2>Session stats</h2>
        <table>
          <thead>
            <tr>
              <th>Temperature</th>
              <th>Top-k</th>
              <th>Tokens so far</th>
              <th>Tokens left</th>
              <th>Total tokens</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td id="temperature">{stats.temperature}</td>
              <td id="top-k">{stats.topK}</td>
              <td id="tokens-so-far">{stats.tokensSoFar}</td>
              <td id="tokens-left">{stats.tokensLeft}</td>
              <td id="max-tokens">{stats.maxTokens}</td>
            </tr>
          </tbody>
        </table>
        <h2>Conversation</h2>
        <div id="response-area" ref={responseAreaRef} dangerouslySetInnerHTML={{ __html: response }} />
        <details>
          <summary>Raw response</summary>
          <div>{rawResponse}</div>
        </details>
        <button id="copy-link-button">Copy link</button>
      </div>
    </div>
  );
};

export default SidePanel;
