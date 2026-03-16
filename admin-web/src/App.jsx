import React, { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = 'http://192.168.1.8:8000';

/**
 * @typedef {Object} Complaint
 * @property {string} id
 * @property {string} description
 * @property {string} contact_no
 * @property {string} department
 * @property {string} category
 * @property {string} status
 * @property {string} image_status
 * @property {number} ai_score
 * @property {string} sub_division
 * @property {string} [image_url]
 * @property {string} [latitude]
 * @property {string} [longitude]
 */

export default function App() {
  /** @type {[Complaint[], React.Dispatch<React.SetStateAction<Complaint[]>>]} */
  const [complaints, setComplaints] = useState([]);
  const [currentTime, setCurrentTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTickets, setShowAllTickets] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(null);

  const fetchComplaints = () => {
    fetch(`${API_BASE_URL}/complaints`)
      .then((res) => res.json())
      .then((data) => setComplaints(data.reverse()))
      .catch((err) => console.error('Error fetching data:', err));
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
      const response = await fetch(`${API_BASE_URL}/complaints/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setComplaints((prevComplaints) =>
          prevComplaints.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
        );
      }
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === 'Pending').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;
  const critical = complaints.filter(
    (c) =>
      (c.department?.includes('Emergency') || c.department?.includes('Police')) &&
      c.status === 'Pending'
  ).length;

  const toLower = (value) => String(value || '').toLowerCase();
  const isEmergencyTicket = (ticket) => {
    const category = toLower(ticket.category);
    const department = toLower(ticket.department);
    return category === 'emergency' || department.includes('emergency');
  };

  const getEmergencyType = (ticket) => {
    const subDivision = toLower(ticket.sub_division);
    const department = toLower(ticket.department);

    if (subDivision.includes('police')) return 'police';
    if (subDivision.includes('medical') || subDivision.includes('ems') || subDivision.includes('ambulance')) return 'medical';
    if (subDivision.includes('fire')) return 'fire';

    if (department.includes('police')) return 'police';
    if (department.includes('medical') || department.includes('health') || department.includes('hospital') || department.includes('ambulance')) return 'medical';
    if (department.includes('fire')) return 'fire';

    return null;
  };

  const policeEmergencyCount = complaints.filter(
    (ticket) => isEmergencyTicket(ticket) && getEmergencyType(ticket) === 'police'
  ).length;
  const medicalEmergencyCount = complaints.filter(
    (ticket) => isEmergencyTicket(ticket) && getEmergencyType(ticket) === 'medical'
  ).length;
  const fireEmergencyCount = complaints.filter(
    (ticket) => isEmergencyTicket(ticket) && getEmergencyType(ticket) === 'fire'
  ).length;

  const departmentCards = [
    'Sanitation (Swachh Bharat)',
    'Water Supply Board',
    'Electricity Board (PGVCL)',
    'PWD / Roads Department',
    'Health Department',
    'Civic Administration',
    'Veterinary & Animal Control',
    'Environment & Forest',
    'Law & Order',
  ];

  const normalizeDepartment = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[()]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const departmentAliases = {
    'electricity board pgvcl': [
      'electricity board',
      'electricity board pgvcl',
      'pgvcl',
      'power department',
      'electricity department',
    ],
    'sanitation swachh bharat': [
      'sanitation',
      'sanitation swachh bharat',
      'swachh bharat',
    ],
    'water supply board': [
      'water supply board',
      'water and sewage board',
      'water board',
      'sewage board',
      'water and sewerage board',
      'water and sewerage',
    ],
    'pwd roads department': [
      'pwd / roads department',
      'pwd roads department',
      'pwd',
      'public works department',
      'roads department',
      'road department',
      'roads',
    ],
    'health department': [
      'health department',
      'health',
      'hospital department',
    ],
    'civic administration': [
      'civic administration',
      'administration',
      'municipal administration',
    ],
    'veterinary and animal control': [
      'veterinary and animal control',
      'veterinary and animal rescue',
      'veterinary',
      'animal rescue',
      'animal control',
      'animal care',
    ],
    'environment and forest': [
      'environment and forest',
      'parks and forest dept',
      'parks department',
      'forest department',
      'parks and forest',
      'environment',
    ],
    'law and order': [
      'law and order',
      'law order',
    ],
  };

  const getDepartmentCount = (cardLabel) => {
    const normalizedLabel = normalizeDepartment(cardLabel);
    const aliases = departmentAliases[normalizedLabel] || [normalizedLabel];
    return complaints.filter((c) => {
      const dep = normalizeDepartment(c.department);
      return aliases.some((alias) => dep === normalizeDepartment(alias));
    }).length;
  };

  const departmentCounts = departmentCards.map((name) => ({
    name,
    count: getDepartmentCount(name),
  }));

  const toggleFilter = (value) => {
    setSelectedFilter((prev) => (prev === value ? null : value));
  };

  const filteredComplaints = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filterValue = selectedFilter ? String(selectedFilter).toLowerCase() : null;
    return complaints.filter((ticket) => {
      const matchesQuery =
        !query ||
        ticket.id?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query) ||
        ticket.department?.toLowerCase().includes(query) ||
        ticket.category?.toLowerCase().includes(query) ||
        ticket.sub_division?.toLowerCase().includes(query);

      const matchesFilter =
        !filterValue ||
        ticket.department?.toLowerCase().includes(filterValue) ||
        ticket.sub_division?.toLowerCase().includes(filterValue);

      return matchesQuery && matchesFilter;
    });
  }, [complaints, searchQuery, selectedFilter]);

  const headlineStyle = { fontFamily: 'Manrope, Inter, sans-serif' };
  const bodyStyle = { fontFamily: 'Inter, sans-serif' };

  const getDeptIcon = (name) => {
    const value = name.toLowerCase();
    if (value.includes('sanitation')) return 'delete';
    if (value.includes('water')) return 'water_drop';
    if (value.includes('electricity') || value.includes('power')) return 'bolt';
    if (value.includes('pwd') || value.includes('roads')) return 'construction';
    if (value.includes('health')) return 'medical_services';
    if (value.includes('civic') || value.includes('administration')) return 'badge';
    if (value.includes('animal')) return 'pets';
    if (value.includes('environment') || value.includes('forest') || value.includes('parks')) return 'forest';
    if (value.includes('law')) return 'gavel';
    return 'apartment';
  };

  const getSubDivisionBadgeClass = (value) => {
    const normalized = String(value || '').toLowerCase();
    if (normalized.includes('police action required') || normalized.includes('police')) {
      return 'bg-[#ffe8cc] text-[#9a3412]';
    }
    if (normalized.includes('medical') || normalized.includes('ems') || normalized.includes('ambulance')) {
      return 'bg-[#d1e7dd] text-[#0f5132]';
    }
    if (normalized.includes('fire')) {
      return 'bg-[#ffdad6] text-[#93000a]';
    }
    return 'bg-[#ffdad6] text-[#93000a]';
  };

  return (
    <div className="min-h-screen flex bg-[#f8f9fa] text-[#191c1d]" style={bodyStyle}>
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-[#c3c6d6]/20 overflow-hidden">
            <button
              onClick={() => {
                setIsImageModalOpen(false);
                setSelectedImage('');
              }}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f4f5] text-[#434654] hover:bg-[#e7e8e9] transition-colors"
              aria-label="Close image"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            <div className="bg-[#f3f4f5] px-6 py-4 border-b border-[#c3c6d6]/20">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1f2937]" style={headlineStyle}>
                Evidence Photo
              </h3>
            </div>
            <div className="p-6 flex items-center justify-center bg-[#fafafa]">
              <img
                src={`${API_BASE_URL}${selectedImage}`}
                alt="Complaint evidence"
                className="max-h-[70vh] w-auto rounded-xl border border-[#c3c6d6]/20 shadow-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
      <aside className="hidden lg:flex w-64 bg-[#f3f4f5] border-r border-[#c3c6d6]/20 flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#003d9b] flex items-center justify-center text-white">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard_customize</span>
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight" style={headlineStyle}>City AI Admin</h1>
            <p className="text-[0.6875rem] text-[#434654] font-medium">Admin Center</p>
          </div>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#003d9b]/10 text-[#003d9b] rounded-lg font-medium text-sm">
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
            Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[#434654] hover:bg-[#e7e8e9] transition-colors rounded-lg font-medium text-sm">
            <span className="material-symbols-outlined text-xl">notifications</span>
            Alerts
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[#434654] hover:bg-[#e7e8e9] transition-colors rounded-lg font-medium text-sm">
            <span className="material-symbols-outlined text-xl">confirmation_number</span>
            Tickets
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[#434654] hover:bg-[#e7e8e9] transition-colors rounded-lg font-medium text-sm">
            <span className="material-symbols-outlined text-xl">settings</span>
            Settings
          </button>
        </nav>
        <div className="p-4 mt-auto border-t border-[#c3c6d6]/20">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-[#edeeef]">
            <img
              alt="City Admin Avatar"
              className="w-10 h-10 rounded-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBa31nkGNfh2WZnK4mmKs4jXguXfjli2TMU_kEbRYpUuqGZxLg_aWFItcfFoELOHzip9LTt3b4ZkHqdwhqPdX0_tsCC7bbCdTAWY5bLVUnjTNaLPej-sMVqts_ShBHFkKuKI_puSUOItnF8CePrk5bZu2vxWxu1z2UUBObWPQtNUqOs5QxYSgNdNzjiPdUPnqg7SmUhCZ8AdU98SNFTYj-4TVHic6LSy7m0_yhW4u8D4DGWvGTK-FllQKTjOYcNqCeifk1o12XkApUB"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">City Admin</p>
              <p className="text-[0.6rem] text-[#434654] uppercase tracking-wider">Level 4 Auth</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-[#c3c6d6]/20 flex items-center justify-between px-6 lg:px-8 shrink-0">
          <h2 className="text-lg font-extrabold text-[#003d9b] uppercase tracking-tight" style={headlineStyle}>City AI Admin Center</h2>
          <div className="hidden md:flex items-center gap-6">
            <div className="relative w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#434654] text-xl">search</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#f3f4f5] border-none rounded-full text-sm focus:ring-2 focus:ring-[#003d9b]/20"
                placeholder="Search tickets, departments, or citizens..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-4 border-l border-[#c3c6d6]/30 pl-6">
              <button className="bg-[#e7f6ec] text-[#0f5132] px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest flex items-center gap-2 border border-[#b7e4c7]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2ecc71] opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2ecc71]"></span>
                </span>
                Live
              </button>
              <button className="p-2 text-[#434654] hover:bg-[#edeeef] rounded-full transition-colors">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="p-2 text-[#434654] hover:bg-[#edeeef] rounded-full transition-colors">
                <span className="material-symbols-outlined">account_circle</span>
              </button>
              <span className="text-xs font-semibold text-[#434654]">{currentTime}</span>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 bg-[#f8f9fa]">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <KpiCard title="Total Tickets" value={total} accent="border-[#003d9b]" meta="+ Live Feed" />
            <KpiCard title="Critical Alerts" value={critical} accent="border-[#8c0014]" meta="Immediate action" tone="text-[#8c0014]" />
            <KpiCard title="Pending" value={pending} accent="border-[#737685]" meta="Queue status" />
            <KpiCard title="In Progress" value={inProgress} accent="border-[#2d4add]" meta="Field ops" tone="text-[#2d4add]" />
            <KpiCard title="Resolved" value={resolved} accent="border-[#052fc8]" meta="Recovered" tone="text-[#052fc8]" />
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-4 space-y-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-[#ffdad6] relative overflow-hidden">
                <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[#ba1a1a]/10 blur-3xl"></div>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-bold text-base flex items-center gap-2" style={headlineStyle}>
                    <span className="material-symbols-outlined text-[#ba1a1a] animate-pulse">emergency</span>
                    Emergency Breakdown
                  </h4>
                  <span className="text-[0.6875rem] font-bold uppercase bg-[#ffdad6] text-[#93000a] px-2 py-1 rounded">
                    Live Data
                  </span>
                </div>
                <div className="space-y-4">
                  <EmergencyRow
                    title="Police Department"
                    subtitle={`${policeEmergencyCount} Active Queue`}
                    statusLabel="NORMAL"
                    statusTone="bg-[#ba1a1a] text-white"
                    icon="local_police"
                    isSelected={selectedFilter === 'Police'}
                    onClick={() => toggleFilter('Police')}
                  />
                  <EmergencyRow
                    title="Medical Emergency"
                    subtitle={`${medicalEmergencyCount} Dispatches`}
                    statusLabel="ELEVATED"
                    statusTone="bg-[#ba1a1a] text-white"
                    icon="medical_services"
                    isSelected={selectedFilter === 'Medical'}
                    onClick={() => toggleFilter('Medical')}
                  />
                  <EmergencyRow
                    title="Fire & Rescue"
                    subtitle={`${fireEmergencyCount} Alerted`}
                    statusLabel="STABLE"
                    statusTone="bg-[#ba1a1a] text-white"
                    icon="fire_truck"
                    isSelected={selectedFilter === 'Fire'}
                    onClick={() => toggleFilter('Fire')}
                  />
                </div>
              </div>

            </div>

            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base" style={headlineStyle}>Civic Departments Summary</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departmentCounts.map(({ name, count }) => (
                    <div
                      key={name}
                      onClick={() => toggleFilter(name)}
                      className={`bg-white p-4 rounded-2xl border border-[#c3c6d6]/20 hover:border-[#003d9b]/40 transition-all shadow-sm cursor-pointer ${
                        selectedFilter === name ? 'ring-2 ring-[#003d9b]/30 border-[#003d9b]/60 bg-[#eef2ff]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#dae2ff] text-[#003d9b] flex items-center justify-center">
                            <span className="material-symbols-outlined">{getDeptIcon(name)}</span>
                          </div>
                          <div>
                            <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#1f2937]">
                              {name}
                            </div>
                            <div className="mt-2 inline-flex items-baseline gap-2">
                              <span className="text-4xl font-black text-[#0f172a]" style={headlineStyle}>
                                {count}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-[0.55rem] font-bold uppercase tracking-[0.25em] text-[#0f5132] bg-[#d1e7dd] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2ecc71] opacity-75"></span>
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#2ecc71]"></span>
                          </span>
                          Live
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

                <div className="bg-white rounded-2xl shadow-sm border border-[#c3c6d6]/20 overflow-hidden">
                <div className="p-6 border-b border-[#c3c6d6]/20 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-base" style={headlineStyle}>Recent AI Allocations</h4>
                    <p className="text-[0.6875rem] text-[#434654]">Real-time NLP Department Routing</p>
                  </div>
                  <button className="flex items-center gap-2 text-xs font-bold text-[#434654] bg-[#edeeef] px-3 py-1.5 rounded-md">
                    <span className="material-symbols-outlined text-sm">filter_alt</span>
                    Filter
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f3f4f5]">
                        <th className="px-6 py-4 text-[0.75rem] font-black uppercase tracking-[0.2em] text-[#1f2937]">Ticket ID</th>
                        <th className="px-6 py-4 text-[0.75rem] font-black uppercase tracking-[0.2em] text-[#1f2937]">Reported Text</th>
                        <th className="px-6 py-4 text-[0.75rem] font-black uppercase tracking-[0.2em] text-[#1f2937]">AI Dept</th>
                        <th className="px-6 py-4 text-[0.75rem] font-black uppercase tracking-[0.2em] text-[#1f2937] text-center">Confidence</th>
                        <th className="px-6 py-4 text-[0.75rem] font-black uppercase tracking-[0.2em] text-[#1f2937] text-center">Location</th>
                        <th className="px-6 py-4 text-[0.75rem] font-black uppercase tracking-[0.2em] text-[#1f2937]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c3c6d6]/20">
                      {(showAllTickets ? filteredComplaints : filteredComplaints.slice(0, 8)).map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-[#f3f4f5]/60 transition-colors">
                          <td className="px-6 py-4 text-xs font-mono font-black text-[#003d9b]">
                            <span className="inline-flex items-center rounded-full bg-[#dee0ff] px-3 py-1">{`#${ticket.id}`}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#1f2937]">
                            <div className="flex items-center gap-3">
                              {ticket.image_url ? (
                                <button
                                  onClick={() => {
                                    setSelectedImage(ticket.image_url);
                                    setIsImageModalOpen(true);
                                  }}
                                  className="h-12 w-12 rounded-lg bg-[#dee0ff] text-[#052fc8] flex items-center justify-center border border-[#c3c6d6]/20 hover:bg-[#c4d2ff] transition-colors"
                                  title="View evidence photo"
                                >
                                  <span className="material-symbols-outlined text-xl">image</span>
                                </button>
                              ) : (
                                <div className="h-12 w-12 rounded-lg bg-[#f3f4f5] flex items-center justify-center text-[#9aa0a6] border border-[#c3c6d6]/20">
                                  <span className="material-symbols-outlined text-xl">hide_image</span>
                                </div>
                              )}
                              <div>
                                <span className="italic font-medium line-clamp-2 block">"{ticket.description}"</span>
                                {ticket.image_url ? (
                                  <span className="mt-1 inline-flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-widest text-[#052fc8]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#052fc8]"></span>
                                    Attachment
                                  </span>
                                ) : (
                                  <span className="mt-1 inline-flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-widest text-[#9aa0a6]">
                                    No Image
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[0.7rem] font-extrabold bg-[#dee0ff] text-[#052fc8] px-3 py-1 rounded-full uppercase tracking-wide">
                                {ticket.department || 'Unassigned'}
                              </span>
                              {ticket.sub_division && ticket.sub_division !== 'N/A' && ticket.sub_division !== 'Public Disturbance' && (
                                <span className={`text-[0.65rem] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${getSubDivisionBadgeClass(ticket.sub_division)}`}>
                                  {ticket.sub_division}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#052fc8]/10 rounded-full text-[#052fc8] font-black text-[0.75rem]">
                              {Number.isFinite(ticket.ai_score) ? `${ticket.ai_score}%` : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {ticket.latitude && ticket.longitude ? (
                              <a
                                href={`https://www.google.com/maps?q=${ticket.latitude},${ticket.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#dae2ff] text-[#003d9b] hover:bg-[#c4d2ff] transition-colors"
                                title="Open in Google Maps"
                              >
                                <span className="material-symbols-outlined text-lg">location_on</span>
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-widest text-[#9aa0a6]">
                                <span className="material-symbols-outlined text-base">location_off</span>
                                No GPS
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {['Pending', 'In Progress', 'Resolved'].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => handleStatusUpdate(ticket.id, status)}
                                  disabled={ticket.status === status}
                                  className={`px-3 py-1.5 rounded-full text-[0.7rem] font-black uppercase border transition-colors ${
                                    status === 'Pending'
                                      ? 'bg-[#ffdad6] text-[#93000a] border-[#ffdad6]'
                                      : status === 'In Progress'
                                        ? 'bg-[#dee0ff] text-[#052fc8] border-[#dee0ff]'
                                        : 'bg-[#d1e7dd] text-[#0f5132] border-[#d1e7dd]'
                                  } ${ticket.status === status ? 'opacity-60' : 'hover:opacity-90'}`}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredComplaints.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-sm text-[#434654]">
                            No complaints found. City is running smoothly.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-[#f3f4f5] border-t border-[#c3c6d6]/20 flex justify-center">
                  <button
                    onClick={() => setShowAllTickets((prev) => !prev)}
                    className="text-xs font-bold text-[#434654] hover:text-[#003d9b] uppercase tracking-widest"
                  >
                    {showAllTickets ? 'Show Less' : 'Load More Activities'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function KpiCard({ title, value, accent, meta, tone }) {
  return (
    <div className={`bg-white p-5 rounded-2xl border border-[#c3c6d6]/20 shadow-sm relative overflow-hidden`}>
      <div className={`absolute left-0 top-0 h-full w-1.5 ${accent}`}></div>
      <p className="text-[0.7rem] font-extrabold text-[#1f2937] uppercase tracking-[0.25em] mb-2">{title}</p>
      <h3 className={`text-5xl font-black ${tone || 'text-[#0f172a]'} leading-none`}>{value}</h3>
      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#e7e8e9] px-3 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#003d9b]"></span>
        <span className="text-[0.7rem] text-[#1f2937] font-bold uppercase tracking-[0.18em]">{meta}</span>
      </div>
    </div>
  );
}

function EmergencyRow({ title, subtitle, statusLabel, statusTone, icon, onClick, isSelected }) {
  const subtitleParts = String(subtitle || '').split(' ');
  const subtitleNumber = subtitleParts.shift() || '';
  const subtitleLabel = subtitleParts.join(' ');
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg bg-[#fff4f2] border border-[#ffdad6] relative overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-[#ba1a1a]/40 bg-[#ffe9e6]' : ''
      }`}
    >
      <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-[#ba1a1a]/10 blur-2xl"></div>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-4 flex-1">
          <div className="p-2.5 text-[#ba1a1a] animate-pulse">
            <span className="material-symbols-outlined text-lg">{icon}</span>
          </div>
          <div className="flex-1 text-center">
            <p className="text-[0.7rem] font-extrabold text-[#93000a] uppercase tracking-[0.2em]">{title}</p>
            <div className="mt-2 flex flex-col items-center gap-1">
              <span className="text-4xl font-black text-[#ba1a1a] leading-none">{subtitleNumber}</span>
              <span className="text-[0.7rem] font-extrabold text-[#93000a] uppercase tracking-[0.3em]">
                {subtitleLabel}
              </span>
            </div>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-[0.625rem] font-bold ${statusTone}`}>{statusLabel}</span>
      </div>
      <div className="flex items-center justify-between text-xs mt-3">
        <span className="text-[#93000a] font-semibold">Response Window</span>
        <span className="font-bold text-[#93000a] flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ba1a1a] animate-ping"></span>
          Live
        </span>
      </div>
    </div>
  );
}
