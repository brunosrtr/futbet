import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import MobileNav from './components/MobileNav'
import BetSlip from './components/BetSlip'
import Home from './pages/Home'
import GamePage from './pages/GamePage'
import CreateGame from './pages/CreateGame'
import MyBets from './pages/MyBets'
import Ranking from './pages/Ranking'
import Login from './pages/Login'

export default function App() {
  return (
    <>
      <Header />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-28 pt-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:pb-10">
        <main className="min-w-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/jogo/:id" element={<GamePage />} />
            <Route path="/criar" element={<CreateGame />} />
            <Route path="/minhas-apostas" element={<MyBets />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <BetSlip />
      </div>
      <footer className="hidden border-t border-line py-6 text-center text-xs text-muted lg:block">
        FutBet · diversão entre amigos · moeda fictícia (FC), sem dinheiro real
      </footer>
      <MobileNav />
    </>
  )
}
