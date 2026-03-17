import { Link } from 'react-router-dom'
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-7xl font-black text-gray-200 mb-4">404</h1>
        <p className="text-gray-600 mb-6">Page not found</p>
        <Link to="/command-center" className="bg-teal-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-teal-600">Go to Dashboard</Link>
      </div>
    </div>
  )
}
