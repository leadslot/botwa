import WebchatWidget from './webchat-widget'

export default async function WidgetPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params
  return <WebchatWidget businessId={businessId} />
}
