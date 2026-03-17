import { Link } from 'react-router-dom'
import { Car, ChevronRight, BarChart2, Clock, CheckCircle, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center"><Car size={16} className="text-white" /></div>
          <span className="font-bold text-lg"><span className="text-teal-400">Recon</span>Pulse</span>
        </div>
        <div className="flex items-center gap-6">
          {['Why ReconPulse','Features','How It Works','Pricing'].map(l => <a key={l} href="#" className="text-sm text-gray-400 hover:text-white hidden md:block">{l}</a>)}
          <Link to="/auth" className="text-sm text-gray-300 hover:text-white">Log In</Link>
          <Link to="/auth" className="bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold px-4 py-2 rounded-lg">Schedule a Demo</Link>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <p className="text-teal-400 text-sm font-semibold uppercase tracking-widest mb-4">Reconditioning Software</p>
        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">
          See and control your<br />entire recon process<br /><span className="text-teal-400">in real time.</span>
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-lg">Know exactly where every vehicle sits — from acquisition to front-line ready.</p>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="bg-teal-500 hover:bg-teal-400 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2">
            Get Started <ChevronRight size={18} />
          </Link>
          <Link to="/auth" className="border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold px-6 py-3 rounded-xl">Log In</Link>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[{icon:BarChart2,title:'Real-time tracking',desc:'Live vehicle pipeline visibility'},{icon:Clock,title:'SLA monitoring',desc:'Never miss a deadline again'},{icon:CheckCircle,title:'Approval workflows',desc:'Streamlined approval process'},{icon:Shield,title:'Role-based access',desc:'Right access for every role'}].map(({icon:Icon,title,desc})=>(
          <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <Icon size={20} className="text-teal-400 mb-3" />
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-gray-500">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
