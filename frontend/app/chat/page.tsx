'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { fetchVoiceChat, fetchTextChat } from '@/lib/api'

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Marathi']

const SUGGESTIONS = [
  'How is my career this year?',
  'When will I get married?',
  'Is this a good time to invest?',
  'How is my health this month?',
  'Best dates for travel?',
]

interface Message {
  role: 'user' | 'ai'
  text: string
  audioBase64?: string
}

function WaveBar({ delay }: { delay: string }) {
  return (
    <div style={{
      width: '4px', backgroundColor: '#c9a84c', borderRadius: '2px',
      animation: 'soundwave 0.8s ease-in-out infinite alternate',
      animationDelay: delay,
    }} />
  )
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState('')
  const [language, setLanguage] = useState('English')
  const [messages, setMessages] = useState<Message[]>([])
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [textInput, setTextInput] = useState('')
  const [error, setError] = useState('')
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const uid = localStorage.getItem('jyotish_user_id') || ''
    setUserId(uid)
    const q = searchParams.get('q')
    if (q) setTextInput(q)
  }, [searchParams])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function playAudio(base64: string) {
    try {
      const bytes = atob(base64)
      const arr = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
      const blob = new Blob([arr], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.play()
      audio.onended = () => URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunks.current = []
      mr.ondataavailable = e => audioChunks.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        await sendVoice(audioBlob)
      }
      mr.start()
      mediaRecorder.current = mr
      setRecording(true)
    } catch {
      setError('Microphone access denied. Please allow microphone permissions.')
    }
  }

  function stopRecording() {
    mediaRecorder.current?.stop()
    setRecording(false)
  }

  const sendVoice = useCallback(async (blob: Blob) => {
    if (!userId) { setError('Please complete onboarding first.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetchVoiceChat(blob, userId, language)
      setTranscript(res.transcript)
      const aiMsg: Message = { role: 'ai', text: res.response_text, audioBase64: res.audio_base64 }
      setMessages(prev => [...prev, { role: 'user', text: res.transcript }, aiMsg])
      if (res.audio_base64) playAudio(res.audio_base64)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Voice chat failed.')
    } finally {
      setLoading(false)
    }
  }, [userId, language])

  async function sendText(msg?: string) {
    const message = msg || textInput.trim()
    if (!message) return
    if (!userId) { setError('Please complete onboarding first.'); return }
    setLoading(true)
    setError('')
    setTextInput('')
    setMessages(prev => [...prev, { role: 'user', text: message }])
    try {
      const res = await fetchTextChat(message, userId, language)
      const aiMsg: Message = { role: 'ai', text: res.response_text, audioBase64: res.audio_base64 }
      setMessages(prev => [...prev, aiMsg])
      if (res.audio_base64) playAudio(res.audio_base64)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Chat failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#0a0a1a', minHeight: '100vh', color: '#f0eee4', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1, maxWidth: '800px', width: '100%', margin: '0 auto', padding: '5rem 1.5rem 2rem', display: 'flex', flexDirection: 'column' }}>

        {/* Language toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
          {LANGUAGES.map(l => (
            <button key={l} onClick={() => setLanguage(l)}
              style={{
                padding: '0.4rem 1rem', borderRadius: '50px', cursor: 'pointer',
                border: `1px solid ${language === l ? '#c9a84c' : '#c9a84c44'}`,
                backgroundColor: language === l ? '#c9a84c22' : 'transparent',
                color: language === l ? '#c9a84c' : '#f0eee4aa',
                fontFamily: 'var(--font-cinzel)', fontSize: '0.8rem',
              }}>
              {l}
            </button>
          ))}
        </div>

        {/* Mic button */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={loading}
            style={{
              width: '100px', height: '100px', borderRadius: '50%',
              border: `3px solid ${recording ? '#ff4444' : '#c9a84c'}`,
              backgroundColor: recording ? '#ff444422' : '#c9a84c22',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
              animation: recording ? 'pulse 1.5s ease-in-out infinite' : 'none',
              transition: 'all 0.3s',
            }}>
            {recording ? '⏹' : '🎙️'}
          </button>
          <p style={{ color: '#f0eee4aa', fontSize: '0.85rem', marginTop: '0.75rem' }}>
            {loading ? 'Consulting the stars...' : recording ? 'Recording — tap to stop' : 'Tap to speak'}
          </p>

          {recording && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center', height: '40px', marginTop: '0.5rem' }}>
              {['0s', '0.1s', '0.2s', '0.3s', '0.4s'].map((d, i) => (
                <WaveBar key={i} delay={d} />
              ))}
            </div>
          )}

          {transcript && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: '8px', backgroundColor: '#0d0d22', border: '1px solid #c9a84c33', color: '#f0eee4aa', fontSize: '0.9rem', fontStyle: 'italic' }}>
              &ldquo;{transcript}&rdquo;
            </div>
          )}
        </div>

        {/* Suggested questions */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => sendText(s)} disabled={loading}
              style={{
                padding: '0.5rem 1rem', borderRadius: '50px', cursor: 'pointer',
                border: '1px solid #c9a84c44', backgroundColor: 'transparent',
                color: '#f0eee4cc', fontSize: '0.85rem', transition: 'all 0.2s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#c9a84c'; (e.currentTarget as HTMLElement).style.color = '#c9a84c' }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = '#c9a84c44'; (e.currentTarget as HTMLElement).style.color = '#f0eee4cc' }}>
              {s}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: '#ff444422', border: '1px solid #ff4444aa', color: '#ff8888', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Chat history */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', maxHeight: '400px', paddingRight: '4px' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '0.9rem 1.2rem', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                backgroundColor: m.role === 'user' ? '#c9a84c22' : '#0d0d22',
                border: `1px solid ${m.role === 'user' ? '#c9a84c55' : '#c9a84c22'}`,
                fontSize: '0.95rem', lineHeight: 1.6, color: '#f0eee4',
              }}>
                {m.role === 'ai' && <div style={{ color: '#c9a84c', fontSize: '0.75rem', fontFamily: 'var(--font-cinzel)', marginBottom: '0.4rem' }}>✦ JYOTISH AI</div>}
                {m.text}
                {m.role === 'ai' && m.audioBase64 && (
                  <button onClick={() => m.audioBase64 && playAudio(m.audioBase64)}
                    style={{ marginTop: '0.5rem', padding: '0.3rem 0.8rem', borderRadius: '50px', border: '1px solid #c9a84c44', backgroundColor: 'transparent', color: '#c9a84c', cursor: 'pointer', fontSize: '0.8rem' }}>
                    ▶ Play Again
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Text input */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendText()}
            placeholder="Or type your question here..."
            disabled={loading}
            style={{
              flex: 1, padding: '0.85rem 1rem', borderRadius: '8px',
              border: '1px solid #c9a84c44', backgroundColor: '#0d0d22',
              color: '#f0eee4', fontSize: '1rem', outline: 'none',
            }}
          />
          <button onClick={() => sendText()} disabled={loading || !textInput.trim()}
            style={{
              padding: '0.85rem 1.5rem', borderRadius: '8px', cursor: 'pointer',
              border: 'none', background: 'linear-gradient(135deg, #c9a84c, #a07830)',
              color: '#0a0a1a', fontWeight: 700, fontSize: '1rem',
              opacity: loading || !textInput.trim() ? 0.5 : 1,
            }}>
            ✦
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#f0eee4aa', fontSize: '0.75rem', marginTop: '1.5rem' }}>
          Jyotish AI readings are for guidance and entertainment purposes only.
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,68,68,0.4); }
          50% { box-shadow: 0 0 0 20px rgba(255,68,68,0); }
        }
        @keyframes soundwave {
          from { height: 8px; }
          to { height: 36px; }
        }
      `}</style>
    </div>
  )
}
