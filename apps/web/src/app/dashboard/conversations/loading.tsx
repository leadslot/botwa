export default function Loading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-48 mb-2" />
      <div className="h-4 bg-gray-100 rounded-xl w-64 mb-8" />
      <div className="space-y-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 h-20" />
        ))}
      </div>
    </div>
  )
}
