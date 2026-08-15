import { useEffect, useState } from 'react';

function App() {
  const [userEmail, setUserEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Ask your Personal Brain a question about Gmail and Drive.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = () => {
    if (!emailInput.trim()) return;
    setUserEmail(emailInput.trim());
  };

  useEffect(() => {
    async function checkAuth() {
      if (!userEmail) return;
      setCheckingAuth(true);
      try {
        const res = await fetch('http://localhost:4000/auth/status');
        const data = await res.json();
        setAuthorized(data.googleAuthorized);
      } catch (error) {
        setAuthorized(false);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, [userEmail]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const question = input.trim();
    const nextMessages = [...messages, { role: 'user', text: question }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer || 'No answer returned.' }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Error contacting backend.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!userEmail) {
    return (
      <div className="app-shell">
        <header>
          <h1>Personal Brain</h1>
          <p>Enter your email to start the chat experience.</p>
        </header>
        <main className="landing-screen">
          <div className="landing-card">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
            />
            <button onClick={handleStart} disabled={!emailInput.trim()}>
              Continue
            </button>
            <p className="landing-note">This email is used to identify the Google login and personalize your session.</p>
          </div>
        </main>
      </div>
    );
  }

  const authUrl = `http://localhost:4000/auth/google?email=${encodeURIComponent(userEmail)}`;

  return (
    <div className="app-shell">
      <header>
        <h1>Personal Brain</h1>
        <p>Signed in as {userEmail}</p>
      </header>
      <main>
        {!authorized ? (
          <div className="landing-screen">
            <div className="landing-card">
              <h2>Connect Gmail and Drive</h2>
              <p>
                To access your inbox and Drive, authorize Google for the email account you entered.
              </p>
              <a className="button-link" href={authUrl}>
                Connect Google account
              </a>
              <button className="secondary-button" onClick={() => window.location.reload()}>
                Refresh authorization status
              </button>
              {checkingAuth && <p className="landing-note">Checking authorization status...</p>}
              <p className="landing-note">
                After authorization completes, come back here and refresh the page.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="chat-window">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  <span>{msg.text}</span>
                </div>
              ))}
            </div>
            <div className="input-row">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something..."
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage} disabled={loading || !input.trim()}>
                {loading ? 'Thinking...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
