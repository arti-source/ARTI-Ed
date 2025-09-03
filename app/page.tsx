import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-2xl p-8">
        <h1 className="text-5xl font-bold mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
          🎓 ARTI Ed
        </h1>
        <p className="text-xl mb-8 opacity-90">
          An intelligent educational platform powered by AI
        </p>
        
        <div className="flex gap-4 mb-8">
          <div className="bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">
            🚀 Nå tilgjengelig
          </div>
          <div className="bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">
            🤖 AI-Powered
          </div>
          <div className="bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">
            📚 Educational
          </div>
        </div>

        <p className="text-base opacity-70 mb-8">
          Få tilgang til profesjonelle kurs og læringsressurser
        </p>

        <Link 
          href="/auth"
          className="inline-block px-8 py-4 bg-white/30 hover:bg-white/40 text-white no-underline rounded-full font-semibold text-lg transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-md"
        >
          Kom i gang nå →
        </Link>
      </div>
    </div>
  )
}