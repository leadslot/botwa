export default function Loading() {
  return (
    <div className="p-8 max-w-2xl animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-64 mb-2" />
      <div className="h-4 bg-gray-100 rounded-xl w-48 mb-8" />
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 h-20" />
        <div className="bg-white rounded-2xl border border-gray-100 h-20" />
        <div className="bg-white rounded-2xl border border-gray-100 h-64" />
        <div className="bg-indigo-500 rounded-2xl h-12 opacity-60" />
      </div>
    </div>
  )
}
