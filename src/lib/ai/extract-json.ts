// The model sometimes wraps JSON in ```json fences, in '''json fences, or
// adds prose around it. Strip any fence variant, then fall back to the
// outermost {...} block so JSON.parse always receives bare JSON.
export function extractJsonObject(text: string): string {
  const fence = text.match(/(?:```|''')\s*(?:json)?\s*([\s\S]*?)(?:```|''')/);
  const candidate = (fence ? fence[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new SyntaxError("No JSON object found in AI response");
  }
  return candidate.slice(start, end + 1);
}
