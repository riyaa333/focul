'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import s from './waiting.module.css'

type Lookup = {
  email: string
  ref_code: string
  position: number
  raw_position: number
  referrals: number
}

function WaitingInner() {
  const params = useSearchParams()
  const ref = params.get('ref') ?? ''
  const [data, setData] = useState<Lookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!ref) {
      setError('Missing referral code in URL.')
      return
    }
    fetch(`/api/waitlist/lookup?ref=${encodeURIComponent(ref)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Could not load your spot. Refresh and try again.'))
  }, [ref])

  const referralLink =
    typeof window !== 'undefined' && data
      ? `${window.location.origin}/waitlist?ref=${data.ref_code}`
      : ''

  function copy() {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const tweet = `I just joined the waitlist for Focul — a focus timer for founders that remembers your work. Skip ahead with my link: ${referralLink}`
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`
  const mailtoHref = `mailto:?subject=${encodeURIComponent('You should try Focul')}&body=${encodeURIComponent(tweet)}`

  return (
    <main className={s.wrap}>
      <Link href="/" className={s.back}>← Focul</Link>

      <div className={s.card}>
        <div className={s.badge}>
          <span className={s.badgeDot} />
          You're in
        </div>

        <h1 className={s.h1}>
          You're #
          <span className={s.num}>{data ? data.position : '—'}</span>
          <br />
          on the waitlist.
        </h1>

        <p className={s.sub}>
          First 500 founders get founder pricing. We'll be in touch as Focul opens up.
        </p>

        {error && <p className={s.err}>{error}</p>}

        <div className={s.refBlock}>
          <div className={s.refLabel}>Skip 5 spots for every founder you refer</div>
          <div className={s.refRow}>
            <input
              className={s.refInput}
              readOnly
              value={referralLink || 'Loading…'}
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button className={s.refBtn} onClick={copy} disabled={!referralLink}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className={s.shareRow}>
            <a href={twitterHref} target="_blank" rel="noreferrer">Share on X</a>
            <a href={linkedinHref} target="_blank" rel="noreferrer">LinkedIn</a>
            <a href={mailtoHref}>Email</a>
          </div>

          {data && data.referrals > 0 && (
            <p className={s.refCount}>
              {data.referrals} {data.referrals === 1 ? 'founder' : 'founders'} joined with your link.
            </p>
          )}
        </div>

        <ol className={s.timeline}>
          <li>
            <span className={s.tlStep}>1</span>
            <div>
              <strong>You're on the list</strong>
              <p>Your spot is locked in. The earlier the position, the sooner you get access.</p>
            </div>
          </li>
          <li>
            <span className={s.tlStep}>2</span>
            <div>
              <strong>When Focul launches</strong>
              <p>macOS app coming soon. You'll be among the first founders to get access and help shape it.</p>
            </div>
          </li>
          <li>
            <span className={s.tlStep}>3</span>
            <div>
              <strong>First 500 founders</strong>
              <p>Founder pricing locked in. No card today. Just feedback as the product ships.</p>
            </div>
          </li>
        </ol>
      </div>
    </main>
  )
}

export default function WaitingPage() {
  return (
    <Suspense fallback={null}>
      <WaitingInner />
    </Suspense>
  )
}
