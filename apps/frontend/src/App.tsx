import { useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  Mail,
  Search,
  Send,
  Settings,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import "./App.css";

const API = "http://localhost:5000";

type Email = {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  _count?: {
    emails: number;
  };
};

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("reachinbox_user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const id = params.get("id");
    const email = params.get("email");
    const name = params.get("name");
    const picture = params.get("picture");

    if (id && email) {
      const loggedInUser = {
        id,
        email,
        name: name || "Google User",
        picture: picture || "",
      };

      localStorage.setItem(
        "reachinbox_user",
        JSON.stringify(loggedInUser)
      );

      setUser(loggedInUser);

      window.history.replaceState({}, "", "/");
    }
  }, []);

  const [active, setActive] = useState("Dashboard");
  const [emails, setEmails] = useState<Email[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [emailRes, campaignRes] = await Promise.all([
        fetch(`${API}/emails`),
        fetch(`${API}/campaigns`),
      ]);

      const emailData = await emailRes.json();
      const campaignData = await campaignRes.json();

      setEmails(emailData.emails || []);
      setCampaigns(campaignData.campaigns || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSearch() {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `${API}/emails/search?q=${encodeURIComponent(search)}`
      );

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error(error);
    }
  }

  const sent = emails.filter((e) => e.status === "SENT").length;
  const scheduled = emails.filter(
    (e) => e.status === "QUEUED" || e.status === "PENDING"
  ).length;
  const failed = emails.filter((e) => e.status === "FAILED").length;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">
            <Send size={18} />
          </div>
          <span>ReachInbox</span>
        </div>

        <nav>
          {[
            ["Dashboard", LayoutDashboard],
            ["Campaigns", Mail],
            ["Emails", FileText],
            ["Search", Search],
            ["Settings", Settings],
          ].map(([name, Icon]: any) => (
            <button
              key={name}
              className={active === name ? "nav-item active" : "nav-item"}
              onClick={() => setActive(name)}
            >
              <Icon size={18} />
              {name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div>
              <strong>{user?.name || "Demo User"}</strong>
              <span>{user?.email || "demo@reachinbox.local"}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <h1>{active}</h1>
            <p>
              {active === "Dashboard"
                ? "Monitor your email campaigns and delivery activity."
                : `Manage your ${active.toLowerCase()}.`}
            </p>
          </div>

          <button
            className="google-button"
            onClick={() =>
              (window.location.href = `${API}/api/auth/google`)
            }
          >
            Continue with Google
          </button>
        </header>

        {active === "Dashboard" && (
          <>
            <section className="stats">
              <Stat
                icon={<Send />}
                label="Emails Sent"
                value={sent}
                description="Successfully delivered"
              />
              <Stat
                icon={<Clock3 />}
                label="Scheduled"
                value={scheduled}
                description="Waiting to be sent"
              />
              <Stat
                icon={<XCircle />}
                label="Failed"
                value={failed}
                description="Requires attention"
              />
              <Stat
                icon={<Users />}
                label="Campaigns"
                value={campaigns.length}
                description="Total campaigns"
              />
            </section>

            <section className="content-grid">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Recent campaigns</h2>
                    <p>Your latest email campaigns</p>
                  </div>

                  <button
                    className="primary"
                    onClick={() => setActive("Campaigns")}
                  >
                    <Upload size={16} />
                    New Campaign
                  </button>
                </div>

                {loading ? (
                  <div className="empty">Loading campaigns...</div>
                ) : campaigns.length === 0 ? (
                  <div className="empty">
                    <BarChart3 size={32} />
                    <strong>No campaigns yet</strong>
                    <span>Create your first campaign to get started.</span>
                  </div>
                ) : (
                  <div className="table">
                    {campaigns.slice(0, 8).map((campaign) => (
                      <div className="table-row" key={campaign.id}>
                        <div>
                          <strong>{campaign.name}</strong>
                          <span>
                            {campaign._count?.emails || 0} recipients
                          </span>
                        </div>
                        <Status status={campaign.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Delivery overview</h2>
                    <p>Email activity</p>
                  </div>
                </div>

                <div className="overview">
                  <div className="overview-icon">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3>{sent} emails sent</h3>
                  <p>
                    Your email queue is being processed by the ReachInbox
                    worker.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {active === "Emails" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>All emails</h2>
                <p>Track individual email delivery.</p>
              </div>
            </div>

            <div className="table">
              {emails.map((email) => (
                <div className="table-row" key={email.id}>
                  <div>
                    <strong>{email.recipient}</strong>
                    <span>{email.subject}</span>
                  </div>
                  <Status status={email.status} />
                </div>
              ))}
            </div>
          </section>
        )}

        {active === "Search" && (
          <section className="panel">
            <div className="search-box">
              <Search size={20} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search recipients, subjects or email content..."
              />
              <button className="primary" onClick={handleSearch}>
                Search
              </button>
            </div>

            <div className="table search-results">
              {searchResults.length === 0 ? (
                <div className="empty">
                  <Search size={32} />
                  <strong>Search your emails</strong>
                  <span>Results will appear here.</span>
                </div>
              ) : (
                searchResults.map((email: any) => (
                  <div className="table-row" key={email.id}>
                    <div>
                      <strong>{email.recipient}</strong>
                      <span>{email.subject}</span>
                    </div>
                    <Status status={email.status} />
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {active === "Campaigns" && (
          <CampaignForm onCreated={loadData} />
        )}

        {active === "Settings" && (
          <section className="panel settings">
            <h2>Integrations</h2>
            <p>Connect services used by ReachInbox.</p>

            <div className="integration">
              <div>
                <strong>Google</strong>
                <span>Authentication</span>
              </div>
              <button
                className="secondary"
                onClick={() =>
                  (window.location.href = `${API}/api/auth/google`)
                }
              >
                Connect
              </button>
            </div>

            <div className="integration">
              <div>
                <strong>Slack</strong>
                <span>Rate limit notifications</span>
              </div>
              <button
                className="secondary"
                onClick={() =>
                  (window.location.href = `${API}/api/slack/connect`)
                }
              >
                Connect
              </button>
            </div>

            <a
              className="bull-link"
              href={`${API}/admin/queues`}
              target="_blank"
            >
              Open BullMQ Queue Dashboard →
            </a>
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{description}</small>
    </div>
  );
}

function Status({ status }: { status: string }) {
  return <span className={`status ${status.toLowerCase()}`}>{status}</span>;
}

function CampaignForm({ onCreated }: { onCreated: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [startAt, setStartAt] = useState("");
  const [delayMs, setDelayMs] = useState("2000");
  const [hourlyLimit, setHourlyLimit] = useState("100");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setMessage("Please select a CSV file.");
      return;
    }

    setSending(true);
    setMessage("");

    const form = new FormData();
    form.append("file", file);
    form.append("name", campaignName);
    form.append("subject", subject);
    form.append("body", body);
    form.append("startAt", startAt);
    form.append("delayMs", delayMs);
    form.append("hourlyLimit", hourlyLimit);

    try {
      const response = await fetch(
        "http://localhost:5000/api/campaigns/upload",
        {
          method: "POST",
          body: form,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Campaign failed");
      }

      setMessage(
        `Campaign scheduled successfully — ${data.totalRecipients} recipients.`
      );

      setCampaignName("");
      setSubject("");
      setBody("");
      setStartAt("");
      setFile(null);

      onCreated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="panel campaign-form">
      <div className="panel-header">
        <div>
          <h2>Create campaign</h2>
          <p>Upload your recipient CSV and configure delivery.</p>
        </div>
      </div>

      <form onSubmit={submit}>
        <label>
          Campaign Name
          <input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g. September Outreach"
            required
          />
        </label>

        <label>
          Start Time
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
          />
        </label>

        <label>
          Recipient CSV
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <label>
          Subject
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Your email subject"
            required
          />
        </label>

        <label>
          Email body
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email..."
            rows={6}
            required
          />
        </label>

        <div className="form-grid">
          <label>
            Delay between emails (ms)
            <input
              type="number"
              value={delayMs}
              onChange={(e) => setDelayMs(e.target.value)}
              min="0"
            />
          </label>

          <label>
            Hourly limit
            <input
              type="number"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value)}
              min="1"
            />
          </label>
        </div>

        <button className="primary submit" disabled={sending}>
          {sending ? "Scheduling..." : "Schedule Campaign"}
        </button>

        {message && <div className="form-message">{message}</div>}
      </form>
    </section>
  );
}

export default App;