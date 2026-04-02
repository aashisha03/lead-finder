"use client";

import { useState, useEffect } from "react";
import { PersonResult } from "@/types";

interface OutreachModalProps {
  person: PersonResult;
  sourceQuery?: string;
  onClose: () => void;
  onLogged: () => void; // called after successful log so tracker can refresh
}

export function OutreachModal({
  person,
  sourceQuery,
  onClose,
  onLogged,
}: OutreachModalProps) {
  const [email, setEmail] = useState(
    person.emails?.[0] || person.inferred_email?.replace(" (inferred)", "") || ""
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [project, setProject] = useState("");
  const [newProject, setNewProject] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [projects, setProjects] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "logging" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(data.map((p: { name: string }) => p.name));
        }
      })
      .catch(() => {});
  }, []);

  const activeProject = showNewProject ? newProject.trim() : project;

  async function handleSubmit(sendEmail: boolean) {
    if (!email.trim()) {
      setErrorMsg("Email address is required.");
      setStatus("error");
      return;
    }
    if (!subject.trim()) {
      setErrorMsg("Subject is required.");
      setStatus("error");
      return;
    }
    if (!body.trim()) {
      setErrorMsg("Message body is required.");
      setStatus("error");
      return;
    }

    setStatus(sendEmail ? "sending" : "logging");
    setErrorMsg("");

    let entryStatus: "sent" | "logged" | "failed" = "logged";
    let errorMessage: string | undefined;

    if (sendEmail) {
      try {
        const res = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: email, subject, body }),
        });
        const data = await res.json();
        if (!res.ok) {
          entryStatus = "failed";
          errorMessage = data.error;
        } else {
          entryStatus = "sent";
        }
      } catch (err: any) {
        entryStatus = "failed";
        errorMessage = err.message;
      }

      if (entryStatus === "failed") {
        setErrorMsg(errorMessage || "Failed to send email.");
        setStatus("error");
        return;
      }
    }

    // Log the entry regardless
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: activeProject || "Uncategorized",
          personName: person.name,
          email,
          subject,
          body,
          status: entryStatus,
          errorMessage,
          sourceQuery,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to log");
      }
    } catch (err: any) {
      setErrorMsg("Sent but failed to log: " + err.message);
      setStatus("error");
      return;
    }

    setStatus("success");
    onLogged();
    setTimeout(onClose, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Log Outreach</h2>
            <p className="text-sm text-gray-500">{person.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Email address */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              To (email address)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Show all found emails as quick-select chips */}
            {(person.emails?.length || 0) > 1 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {person.emails!.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmail(e)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      email === e
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Project */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Project
            </label>
            {!showNewProject ? (
              <div className="flex gap-2">
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Uncategorized</option>
                  {projects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="text-sm px-3 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  placeholder="Project name"
                  autoFocus
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => { setShowNewProject(false); setNewProject(""); }}
                  className="text-sm px-3 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Your subject line"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              placeholder={`Hi ${person.name.split(" ")[0]},\n\n`}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Status messages */}
          {status === "error" && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}
          {status === "success" && (
            <p className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">
              ✓ Logged successfully!
            </p>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-5 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={status === "sending" || status === "logging"}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={status === "sending" || status === "logging" || status === "success"}
            className="px-4 py-2 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {status === "logging" ? "Logging…" : "Log Only"}
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={status === "sending" || status === "logging" || status === "success"}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Send & Log"}
          </button>
        </div>
      </div>
    </div>
  );
}
