export function saveToHistory(type: string, query: string, result: any) {
  fetch("/api/history", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, query, result }),
  }).catch(() => {});
}
