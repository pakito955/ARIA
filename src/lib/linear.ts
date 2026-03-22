export async function createLinearIssue(apiKey: string, title: string, priority?: string): Promise<boolean> {
  const priorityMap: Record<string, number> = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 }
  try {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation IssueCreate($title: String!, $priority: Int) {
            issueCreate(input: { title: $title, priority: $priority }) {
              success
              issue { id title }
            }
          }
        `,
        variables: {
          title: `[ARIA] ${title}`,
          priority: priorityMap[priority || 'MEDIUM'] || 3,
        },
      }),
    })
    const data = await res.json()
    return data?.data?.issueCreate?.success === true
  } catch {
    return false
  }
}
