/**
 * Mirrors the backend query syntax (Threat_Backend/database/utils/serializers.py)
 * just far enough to know which words to highlight in search results.
 *
 *   malicious            free text
 *   level:ERROR          field filter   (level, source, service, prediction, message, id)
 *   "rows malicious"     quoted phrase
 *   a AND b              AND is optional; all terms must match
 */
const TOKEN = /(\w+):"([^"]*)"|(\w+):(\S+)|"([^"]*)"|(\S+)/g
const FIELDS = new Set(["level", "source", "service", "prediction", "message", "id"])

export function parseSearchTerms(query: string): string[] {
  const terms: string[] = []
  for (const m of query.matchAll(TOKEN)) {
    const [, fq, fqv, f, fv, phrase, word] = m
    let value: string
    if (fq || f) {
      const field = (fq || f).toLowerCase()
      const raw = fq ? fqv : fv
      value = FIELDS.has(field) ? raw : `${fq || f}:${raw}`
    } else {
      value = phrase ?? word ?? ""
      if (value.toUpperCase() === "AND") continue
    }
    value = value.trim()
    if (value) terms.push(value)
  }
  return terms
}
