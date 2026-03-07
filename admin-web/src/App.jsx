import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Clock, Loader, MapPin, Camera, Building } from 'lucide-react';

export default function App() {
  const [complaints, setComplaints] = useState([]);
  const [currentTime, setCurrentTime] = useState('');

  const fetchComplaints = () => {
    fetch('http://localhost:8000/complaints')
      .then(res => res.json())
      .then(data => setComplaints(data.reverse()))
      .catch(err => console.error("Error fetching data:", err));
  };

  useEffect(() => {
    fetchComplaints();
    const refreshId = setInterval(fetchComplaints, 5000);
    return () => clearInterval(refreshId);
  }, []);

  useEffect(() => {
    const formatTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setCurrentTime(time);
    };
    formatTime();
    const clockId = setInterval(formatTime, 1000);
    return () => clearInterval(clockId);
  }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const response = await fetch(`http://localhost:8000/complaints/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        setComplaints(prevComplaints => 
          prevComplaints.map(c => c.id === id ? { ...c, status: newStatus } : c)
        );
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const total = complaints.length;
  const pending = complaints.filter(c => c.status === 'Pending').length;
  const inProgress = complaints.filter(c => c.status === 'In Progress').length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;
  const critical = complaints.filter(
    c =>
      (c.department?.includes('Emergency') || c.department?.includes('Police')) &&
      c.status === 'Pending'
  ).length;

  const getDepartmentColor = (department) => {
    if (!department) return 'bg-gray-50';
    const d = department.toLowerCase();
    if (d.includes('electric')) return 'bg-blue-50';
    if (d.includes('sanitation') || d.includes('swachh')) return 'bg-green-50';
    if (d.includes('roads') || d.includes('pwd') || d.includes('road')) return 'bg-orange-50';
    if (d.includes('water')) return 'bg-cyan-50';
    if (d.includes('health') || d.includes('hospital')) return 'bg-rose-50';
    if (d.includes('police') || d.includes('emergency')) return 'bg-red-50';
    return 'bg-gray-50';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <header className="mb-8 flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">City AI Admin Center</h1>
            <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700">
              <Clock size={16} />
              <span>{currentTime}</span>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              <span className="text-green-600">Live</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">Automated Complaint Routing & Management</p>
        </div>
        <button
          onClick={fetchComplaints}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md flex items-center"
        >
          <Clock size={18} className="mr-2" /> Refresh Data
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
        <StatCard title="Total Tickets" count={total} icon={<AlertCircle size={28} className="text-blue-600" />} color="bg-blue-50" borderColor="border-blue-200" />
        <StatCard
          title="Critical Alert"
          count={critical}
          icon={<AlertTriangle size={28} className="text-red-600" />}
          color={critical > 0 ? 'bg-red-50' : 'bg-gray-50'}
          borderColor="border-red-200"
          className={critical > 0 ? 'animate-pulse' : ''}
        />
        <StatCard title="Pending" count={pending} icon={<Clock size={28} className="text-yellow-600" />} color="bg-yellow-50" borderColor="border-yellow-200" />
        <StatCard title="In Progress" count={inProgress} icon={<Loader size={28} className="text-purple-600" />} color="bg-purple-50" borderColor="border-purple-200" />
        <StatCard title="Resolved" count={resolved} icon={<CheckCircle size={28} className="text-green-600" />} color="bg-green-50" borderColor="border-green-200" />
      </div>

      <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-3">
        <h2 className="text-2xl font-bold text-gray-800">Recent AI Allocations</h2>
        <span className="text-sm font-medium text-gray-500 bg-gray-200 px-3 py-1 rounded-full">Live Feed</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {complaints.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-gray-300">
            <CheckCircle size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">No complaints found. City is running smoothly!</p>
          </div>
        ) : (
          complaints.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onStatusChange={handleStatusUpdate}
              departmentColor={getDepartmentColor(ticket.department)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ title, count, icon, color, borderColor, className = '' }) {
  return (
    <div className={`${color} ${className} p-6 rounded-2xl shadow-sm border ${borderColor} flex items-center justify-between transition-transform hover:-translate-y-1 duration-300`}>
      <div>
        <p className="text-gray-600 text-sm font-bold mb-1 uppercase tracking-wider">{title}</p>
        <h3 className="text-4xl font-black text-gray-900">{count}</h3>
      </div>
      <div className="p-3 bg-white/80 rounded-xl shadow-sm">
        {icon}
      </div>
    </div>
  );
}

function TicketCard({ ticket, onStatusChange, departmentColor }) {
  const aiScore = Number.isFinite(ticket.ai_score) ? ticket.ai_score : null;

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col overflow-hidden group">
      <div className={`h-2 w-full ${ticket.status === 'Pending' ? 'bg-yellow-400' : ticket.status === 'Resolved' ? 'bg-green-400' : 'bg-blue-400'}`}></div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <span className="text-xs font-black text-gray-400 tracking-widest uppercase">ID: #{ticket.id}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm ${
            ticket.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
            ticket.status === 'Resolved' ? 'bg-green-100 text-green-800 border border-green-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
            {ticket.status}
          </span>
        </div>

        {ticket.image_url && (
          <div className="mb-4 w-full aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
            <img 
              src={`http://localhost:8000${ticket.image_url}`} 
              alt="Issue evidence" 
              className="h-full w-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        <p className="text-gray-800 text-lg font-medium mb-5 line-clamp-3 flex-1 leading-relaxed">
          "{ticket.description}"
        </p>

        <div className={`${departmentColor} rounded-xl p-4 mb-5 border border-indigo-100/50 group-hover:bg-indigo-50/60 transition-colors`}>
          <div className="flex items-center text-sm font-bold text-indigo-800 mb-2">
            <Building size={18} className="mr-2" />
            {ticket.department}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">AI Confidence Score:</span>
            <span className="text-xs font-black text-indigo-600 bg-white px-2 py-1 rounded-md shadow-sm border border-indigo-100">
              {aiScore === null ? "N/A" : `${aiScore}%`}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-semibold text-gray-400 mt-auto pt-4 border-t border-gray-100 mb-4">
          <div className="flex items-center bg-gray-50 px-2 py-1 rounded-md">
            <MapPin size={14} className="mr-1.5 text-red-400" /> GPS Tagged
          </div>
          <div className="flex items-center bg-gray-50 px-2 py-1 rounded-md">
            <Camera size={14} className="mr-1.5 text-blue-400" /> 
            {ticket.image_status === "No Image Uploaded" ? "No Image" : "Verified"}
          </div>
        </div>

        <div className="flex gap-2 border-t border-gray-100 pt-4 mt-auto">
          <button 
            onClick={() => onStatusChange(ticket.id, 'Pending')}
            disabled={ticket.status === 'Pending'}
            className="flex-1 text-xs font-bold py-2 rounded bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 disabled:opacity-50 transition-colors"
          >
            Pending
          </button>
          <button 
            onClick={() => onStatusChange(ticket.id, 'In Progress')}
            disabled={ticket.status === 'In Progress'}
            className="flex-1 text-xs font-bold py-2 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            In Progress
          </button>
          <button 
            onClick={() => onStatusChange(ticket.id, 'Resolved')}
            disabled={ticket.status === 'Resolved'}
            className="flex-1 text-xs font-bold py-2 rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50 transition-colors"
          >
            Resolved
          </button>
        </div>
      </div>
    </div>
  );
}
