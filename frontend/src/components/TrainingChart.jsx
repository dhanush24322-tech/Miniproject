/**
 * TrainingChart — Canvas-based line chart for training metrics.
 * Draws loss and accuracy curves with smooth lines and tooltips.
 */
import { useEffect, useRef } from 'react';

const COLORS = {
  trainLoss: '#ef4444',
  valLoss: '#f59e0b',
  trainAcc: '#4f7cff',
  valAcc: '#22c55e',
};

export default function TrainingChart({ metrics = [], type = 'loss' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!metrics.length || !canvasRef.current) return;
    drawChart();
  }, [metrics, type]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Data
    let line1, line2, label1, label2, color1, color2;
    if (type === 'loss') {
      line1 = metrics.map((m) => m.train_loss);
      line2 = metrics.map((m) => m.val_loss);
      label1 = 'Train Loss';
      label2 = 'Val Loss';
      color1 = COLORS.trainLoss;
      color2 = COLORS.valLoss;
    } else {
      line1 = metrics.map((m) => m.train_accuracy);
      line2 = metrics.map((m) => m.val_accuracy);
      label1 = 'Train Accuracy';
      label2 = 'Val Accuracy';
      color1 = COLORS.trainAcc;
      color2 = COLORS.valAcc;
    }

    const allValues = [...line1, ...line2].filter((v) => v !== undefined);
    const minVal = Math.min(...allValues) * 0.9;
    const maxVal = Math.max(...allValues) * 1.1 || 1;
    const range = maxVal - minVal || 1;

    // Grid lines
    ctx.strokeStyle = 'rgba(99, 115, 175, 0.1)';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(W - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      const val = maxVal - (range / gridLines) * i;
      ctx.fillStyle = '#5a637a';
      ctx.font = '11px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(3), padding.left - 8, y + 4);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(metrics.length / 10));
    for (let i = 0; i < metrics.length; i += step) {
      const x = padding.left + (chartW / (metrics.length - 1 || 1)) * i;
      ctx.fillStyle = '#5a637a';
      ctx.font = '11px Inter';
      ctx.fillText(`${i + 1}`, x, H - padding.bottom + 20);
    }

    // X-axis title
    ctx.fillStyle = '#8b95b0';
    ctx.font = '12px Inter';
    ctx.fillText('Epoch', W / 2, H - 5);

    // Draw lines
    const drawLine = (data, color) => {
      if (data.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartW / (data.length - 1 || 1)) * i;
        const y = padding.top + chartH - ((data[i] - minVal) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw dots
      for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartW / (data.length - 1 || 1)) * i;
        const y = padding.top + chartH - ((data[i] - minVal) / range) * chartH;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawLine(line1, color1);
    drawLine(line2, color2);
  };

  const isLoss = type === 'loss';

  return (
    <div className="chart-container glass-card">
      <h3 className="section-title">{isLoss ? '📉 Loss Curve' : '📈 Accuracy Curve'}</h3>
      <div className="chart-canvas-wrap">
        <canvas ref={canvasRef}></canvas>
      </div>
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: isLoss ? COLORS.trainLoss : COLORS.trainAcc }}></span>
          {isLoss ? 'Train Loss' : 'Train Accuracy'}
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: isLoss ? COLORS.valLoss : COLORS.valAcc }}></span>
          {isLoss ? 'Val Loss' : 'Val Accuracy'}
        </div>
      </div>
    </div>
  );
}
