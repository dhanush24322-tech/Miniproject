import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Upload, Camera, FileText, CheckCircle } from 'lucide-react';
import client from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function DoctorDashboard() {
  const [file, setFile] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please select a retinal image');
    
    setError('');
    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('patient_name', patientName);

    try {
      // Relative path (no leading slash) for cloud connectivity
      const res = await client.post('doctor/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate(`/doctor/result/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-content p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Retinal <span className="gradient-text">Diagnostics</span></h1>
          <p className="text-slate-400">Upload patient retinal scans for AI-powered DR detection</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Camera className="text-indigo-400" />
              New Analysis
            </h2>

            {error && <div className="alert alert-error mb-4">⚠️ {error}</div>}

            <form onSubmit={handleUpload} className="space-y-6">
              <div className="form-group">
                <label className="block text-slate-400 mb-2">Patient Name</label>
                <input
                  type="text"
                  className="form-input w-full p-3 rounded bg-slate-800"
                  placeholder="e.g. John Doe"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                />
              </div>

              <div className="upload-area glass-card border-dashed p-10 flex-center flex-col text-center hover:border-indigo-500 transition-colors cursor-pointer"
                   onClick={() => document.getElementById('retina-upload').click()}>
                <input 
                  id="retina-upload"
                  type="file" 
                  hidden 
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                {file ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle className="text-emerald-400 mb-4" size={48} />
                    <p className="text-emerald-400 font-bold">{file.name}</p>
                    <p className="text-slate-500 text-sm">Click to change</p>
                  </div>
                ) : (
                  <>
                    <Upload className="text-slate-400 mb-4" size={48} />
                    <p className="font-bold">Drop image or click to upload</p>
                    <p className="text-slate-500 text-sm">Supports TIFF, JPEG, PNG</p>
                  </>
                )}
              </div>

              <button 
                type="submit" 
                className="btn btn-primary w-full p-4 rounded text-lg font-bold bg-indigo-600"
                disabled={loading}
              >
                {loading ? 'AI Analyzing Scan...' : 'Start Diagnosis →'}
              </button>
            </form>
          </div>

          <div className="glass-card p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <FileText className="text-purple-400" />
              Usage Guidelines
            </h2>
            <ul className="space-y-4 text-slate-400">
              <li className="flex gap-2">🔹 Ensure retinal scans are clear and centered.</li>
              <li className="flex gap-2">🔹 AI predictions should be reviewed by a professional.</li>
              <li className="flex gap-2">🔹 Use high-resolution images for best accuracy.</li>
              <li className="flex gap-2">🔹 Heatmaps highlight critical diagnostic regions.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
