export default function DashboardLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-48 mb-2" />
      <div className="h-4 bg-gray-100 rounded-xl w-32 mb-8" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-28" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 h-32 mb-4" />
      <div className="bg-white rounded-2xl border border-gray-100 p-5 h-32" />
    </div>
  )
}
