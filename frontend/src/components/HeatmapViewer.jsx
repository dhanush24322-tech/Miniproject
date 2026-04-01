/**
 * HeatmapViewer — displays original image alongside Grad-CAM heatmap.
 */
import { API_BASE_URL } from '../api/client';

export default function HeatmapViewer({ imagePath, heatmapPath, token }) {
  if (!heatmapPath) {
    return (
      <div className="glass-card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.5 }}>🗺️</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Heatmap visualization not available for this prediction
        </p>
      </div>
    );
  }

  // Extract filenames from paths
  const heatmapFilename = heatmapPath.split(/[/\\]/).pop();

  return (
    <div className="heatmap-viewer glass-card">
      <h3 className="section-title">🗺️ Grad-CAM Attention Map</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: 'var(--space-md)' }}>
        Highlighted regions indicate areas the AI focused on for its diagnosis
      </p>
      <div style={{ textAlign: 'center' }}>
        <img
          src={`${API_BASE_URL}/doctor/heatmap/${heatmapFilename}?token=${token}`}
          alt="Grad-CAM heatmap showing model attention"
          style={{
            maxWidth: '100%',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)',
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
        <p style={{ display: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '2rem' }}>
          Failed to load heatmap image
        </p>
      </div>
    </div>
  );
}
