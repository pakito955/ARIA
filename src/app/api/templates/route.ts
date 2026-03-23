import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const templates = await prisma.emailTemplate.findMany({
    where: { userId: user.id },
    orderBy: [{ useCount: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ data: templates })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, subject, body, category, variables } = await req.json()
  if (!name?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'name and body required' }, { status: 400 })
  }

  const template = await prisma.emailTemplate.create({
    data: {
      userId: user.id,
      name: name.trim(),
      subject: subject?.trim() || '',
      body: body.trim(),
      category: category || null,
      variables: JSON.stringify(variables || []),
    },
  })

  return NextResponse.json({ data: template })
}
