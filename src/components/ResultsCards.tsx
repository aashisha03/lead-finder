"use client";

import { PersonResult } from "@/types";

interface ResultsCardsProps {
  results: PersonResult[];
}

export function ResultsCards({ results }: ResultsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {results.map((person, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow border border-gray-200 p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{person.name}</h3>
              <p className="text-sm text-gray-600">
                {person.role}
                {person.organization ? ` at ${person.organization}` : ""}
              </p>
            </div>
            <ConfidenceBadge score={person.confidence} />
          </div>

          {/* Official Site */}
          {person.official_site && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Official Site</p>
              <a
                href={person.official_site}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {person.official_site}
              </a>
            </div>
          )}

          {/* Profile Links */}
          {person.profile_links && person.profile_links.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Profile Links</p>
              <ul className="space-y-1">
                {person.profile_links.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {truncateUrl(link)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact Links */}
          {person.contact_links && person.contact_links.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Contact / Booking</p>
              <ul className="space-y-1">
                {person.contact_links.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:underline break-all"
                    >
                      {truncateUrl(link)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence */}
          {person.evidence && person.evidence.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Why These Links</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {person.evidence.map((e, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-gray-400 flex-shrink-0">&bull;</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Action */}
          {person.next_best_action && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm">
                <span className="font-medium text-gray-700">Next step: </span>
                <span className="text-gray-600">{person.next_best_action}</span>
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  let color = "bg-red-100 text-red-800";
  if (pct >= 80) color = "bg-green-100 text-green-800";
  else if (pct >= 60) color = "bg-yellow-100 text-yellow-800";
  else if (pct >= 40) color = "bg-orange-100 text-orange-800";

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {pct}%
    </span>
  );
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    const display = u.hostname + path;
    return display.length > 60 ? display.slice(0, 57) + "..." : display;
  } catch {
    return url.length > 60 ? url.slice(0, 57) + "..." : url;
  }
}
