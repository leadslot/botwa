export default function Loading() {
  return (
    <div className="p-8 max-w-2xl animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-40 mb-2" />
      <div className="h-4 bg-gray-100 rounded-xl w-56 mb-8" />
      <div className="bg-white rounded-2xl border border-gray-100 h-64 mb-4" />
      <div className="bg-white rounded-2xl border border-gray-100 h-32" />
    </div>
  )
}
