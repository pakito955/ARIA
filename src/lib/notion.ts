export async function createNotionPage(token: string, databaseId: string, task: {
  title: string
  priority: string
  notes?: string
}): Promise<boolean> {
  try {
    const priorityMap: Record<string, string> = {
      CRITICAL: 'High', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low',
    }
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          title: { title: [{ text: { content: task.title } }] },
          Priority: { select: { name: priorityMap[task.priority] || 'Medium' } },
          Source: { select: { name: 'ARIA' } },
        },
        ...(task.notes && {
          children: [{
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ text: { content: task.notes } }] },
          }],
        }),
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
