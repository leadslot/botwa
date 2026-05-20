'use client'
import dynamic from 'next/dynamic'

const HelpChat = dynamic(() => import('./HelpChat'), { ssr: false })

export default function HelpChatLoader() {
  return <HelpChat />
}
