'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Paper, Stack, Title, Text, TextInput, PasswordInput, Button, Alert, Anchor } from '@mantine/core'
import { HugeiconsIcon } from '@hugeicons/react'
import { BridgeIcon } from '@hugeicons/core-free-icons'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setMessage('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    const { data, error: authError } = await createClient().auth.signUp({
      email, password, options: { data: { full_name: fullName } },
    })
    if (authError) { setError(authError.message); setLoading(false); return }
    if (data.session) { router.push('/dashboard'); router.refresh() }
    else { setMessage('Check your email to confirm your account, then sign in.'); setLoading(false) }
  }

  return (
    <Paper shadow="md" p={40} radius="lg" w={420}>
      <Stack align="center" gap={4} mb="xl">
        <HugeiconsIcon icon={BridgeIcon} size={36} color="#0c8599" strokeWidth={1.5} />
        <Title order={2} fw={800}>Create account</Title>
        <Text c="dimmed" size="sm">Start tracking your community hours</Text>
      </Stack>
      {message ? (
        <Stack gap="md">
          <Alert color="teal" radius="md">{message}</Alert>
          <Button component={Link} href="/login" fullWidth variant="outline">Go to Sign In</Button>
        </Stack>
      ) : (
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" required autoComplete="name" />
            <TextInput label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            <PasswordInput label="Password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required autoComplete="new-password" />
            {error && <Alert color="red" radius="md">{error}</Alert>}
            <Button type="submit" fullWidth size="md" loading={loading} mt={4}>Create Account</Button>
          </Stack>
        </form>
      )}
      <Text ta="center" mt="lg" size="sm" c="dimmed">
        Already have an account?{' '}<Anchor component={Link} href="/login" c="teal" fw={500}>Sign in</Anchor>
      </Text>
    </Paper>
  )
}
