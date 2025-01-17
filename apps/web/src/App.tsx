import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/pages/Dashboard';
import Agents from './components/pages/Agents';
import Tasks from './components/pages/Tasks';
import Reports from './components/pages/Reports';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Router>
        <div className="flex">
          <Navbar />
          <Sidebar />
          <main className="flex-1 p-6 mt-16">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </main>
        </div>
      </Router>
    </div>
  );
}

export default App;