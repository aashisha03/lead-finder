"use client";

import { PersonResult } from "@/types";

interface ResultsTableProps {
  results: PersonResult[];
}

export function ResultsTable({ results }: ResultsTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Organization</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Official Site</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Emails</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Top Links</th>
            <th className="px-4 py-3 text-center font-medium text-gray-700">Confidence</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Next Action</th>
          </tr>
        </thead>
        <tbody>
          {results.map((person, idx) => (
            <tr
              key={idx}
              className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                {person.name}
              </td>
              <td className="px-4 py-3 text-gray-700">{person.role}</td>
              <td className="px-4 py-3 text-gray-700">{person.organization}</td>
              <td className="px-4 py-3">
                {person.official_site ? (
                  <a
                    href={person.official_site}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {shortenUrl(person.official_site)}
                  </a>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  {(person.emails || []).map((email, i) => (
                    <a
                      key={i}
                      href={`mailto:${email}`}
                      className="text-purple-700 hover:underline text-xs"
                    >
                      {email}
                    </a>
                  ))}
                  {(!person.emails || person.emails.length === 0) && person.inferred_email && (
                    <span className="text-gray-400 text-xs italic">
                      {person.inferred_email} (inferred)
                    </span>
                  )}
                  {(!person.emails || person.emails.length === 0) && !person.inferred_email && (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  {[...(person.profile_links || []), ...(person.contact_links || [])]
                    .slice(0, 3)
                    .map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        {shortenUrl(link)}
                      </a>
                    ))}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <ConfidencePill score={person.confidence} />
              </td>
              <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                {person.next_best_action}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfidencePill({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  let color = "bg-red-100 text-red-700";
  if (pct >= 80) color = "bg-green-100 text-green-700";
  else if (pct >= 60) color = "bg-yellow-100 text-yellow-700";
  else if (pct >= 40) color = "bg-orange-100 text-orange-700";

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {pct}%
    </span>
  );
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace("www.", "");
  } catch {
    return url.slice(0, 30);
  }
}
