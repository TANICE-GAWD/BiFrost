'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Paper, Stack, Title, Text, TextInput, PasswordInput, Button, Alert, Anchor, Divider } from '@mantine/core'
import { HugeiconsIcon } from '@hugeicons/react'
import { BridgeIcon, UserIcon } from '@hugeicons/core-free-icons'

const DEMO = { email: '2006princesharma@gmail.com', password: '12345678' }

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  const loginWithDemo = async () => {
    setError('')
    setDemoLoading(true)
    setEmail(DEMO.email)
    setPassword(DEMO.password)
    const { error: authError } = await createClient().auth.signInWithPassword(DEMO)
    if (authError) { setError(authError.message); setDemoLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await createClient().auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Paper shadow="md" p={40} radius="lg" w={420}>
      <Stack align="center" gap={4} mb="xl">
        <HugeiconsIcon icon={BridgeIcon} size={36} color="#0c8599" strokeWidth={1.5} />
        <Title order={2} fw={800}>Welcome back</Title>
        <Text c="dimmed" size="sm">Sign in to track your community hours</Text>
      </Stack>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
          <PasswordInput label="Password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
          {error && <Alert color="red" radius="md">{error}</Alert>}
          <Button type="submit" fullWidth size="md" loading={loading} mt={4}>Sign In</Button>
        </Stack>
      </form>
      <Divider label="or" labelPosition="center" my="md" />
      <Button
        fullWidth variant="light" color="teal" size="md"
        loading={demoLoading}
        leftSection={<HugeiconsIcon icon={UserIcon} size={16} strokeWidth={1.5} />}
        onClick={loginWithDemo}
      >
        Demo Account — Prince Sharma
      </Button>
      <Text ta="center" mt="lg" size="sm" c="dimmed">
        No account?{' '}<Anchor component={Link} href="/register" c="teal" fw={500}>Create one</Anchor>
      </Text>
    </Paper>
  )
}
