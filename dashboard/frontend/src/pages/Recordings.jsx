import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { Mic, Download, Users, Calendar, Clock, Music, FileAudio, ChevronRight, ChevronDown } from 'lucide-react';

const Recordings = () => {
  const { id } = useParams();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetchRecordings();
  }, [id]);

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/guilds/${id}/recordings`);
      setRecordings(res.data);
    } catch (err) {
      console.error('Error fetching recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (recId) => {
    setExpanded(prev => ({
      ...prev,
      [recId]: !prev[recId]
    }));
  };

  const handleDownload = (folder, filename) => {
    const downloadUrl = `${api.defaults.baseURL}/guilds/${id}/recordings/download/${folder}/${filename}`;
    // Re-use session via window.open or a hidden anchor to trigger download
    window.location.href = downloadUrl;
  };

  if (loading) {
    return <div className="loading-screen">Loading Recordings...</div>;
  }

  return (
    <div className="recordings-container page-transition">
      <div className="page-header">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Mic className="text-red-500" /> Voice Recordings
        </h1>
        <p className="text-gray-400 mt-2">Browse and download your multi-track voice captures. Files are kept for 24 hours.</p>
      </div>

      <div className="recordings-list mt-8 space-y-4">
        {recordings.length === 0 ? (
          <div className="empty-state card text-center p-12">
            <Mic size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold">No recordings found</h3>
            <p className="text-gray-400">Recordings will appear here after you use /record start in Discord.</p>
          </div>
        ) : (
          recordings.map((rec) => (
            <div key={rec.id} className="recording-card card overflow-hidden">
              <div 
                className="card-header p-6 flex flex-wrap items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleExpand(rec.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="status-icon bg-red-500/20 p-3 rounded-full">
                    <Clock className="text-red-500" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                       {new Date(rec.startTime).toLocaleDateString()} - {rec.channelName}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                      <span className="flex items-center gap-1"><Users size={14} /> {rec.participants.length} Participants</span>
                      <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(rec.startTime).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {rec.mixedFile && (
                    <button 
                      className="btn btn-primary flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(rec.id, rec.mixedFile);
                      }}
                    >
                      <Download size={18} /> Mixed Master
                    </button>
                  )}
                  {expanded[rec.id] ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>

              {expanded[rec.id] && (
                <div className="card-body p-6 border-t border-white/10 bg-black/20">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Individual Tracks</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rec.participants.map((p) => {
                      const trackFile = rec.individualFiles.find(f => f.startsWith(p.id));
                      return (
                        <div key={p.id} className="participant-track bg-white/5 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={p.avatar} alt={p.username} className="w-10 h-10 rounded-full border border-white/10" />
                            <div>
                              <p className="font-medium text-sm">{p.username}</p>
                              <p className="text-xs text-gray-500">Track Ready</p>
                            </div>
                          </div>
                          {trackFile && (
                            <button 
                              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                              title="Download Track"
                              onClick={() => handleDownload(rec.id, trackFile)}
                            >
                              <Download size={20} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Recordings;
