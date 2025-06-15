const canvas = document.getElementById('draw');
const ctx = canvas.getContext('2d');
ctx.font = '16px sans-serif';
let drawing = false;
let currentPath = [];
let paths = [];
let redoStack = [];
let currentStrokeType = 'free';

function getPos(e) {
  const rect = canvas.getBoundingClientRect();

  if (e.touches && e.touches.length > 0) {
    return {
      x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
      y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height),
    };
  } else {
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }
}

function startDrawing(e) {
  drawing = true;
  currentPath = []; // new stroke
  redoStack = [];   // clear redo history after a new drawing
  const pos = getPos(e);
  currentPath.push(pos);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  e.preventDefault(); // prevent scrolling on touch
}

function draw(e) {
  if (!drawing) return;

  const pos = getPos(e);
  currentPath.push(pos);

  if (currentStrokeType === 'free') {
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else {
    // draw symbol at cursor/finger location with spacing of 15
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'red';
    const spacing = 15;

    for (let i = 0; i < currentPath.length; i += 1) {
      const { x, y } = currentPath[i];
      if (i % spacing === 0 || i == 0) {
        ctx.fillText(currentStrokeType, x, y);
      }
    }
  }
}

function stopDrawing() {
  if (drawing) {
    drawing = false;
    paths.push({ points: currentPath, type: currentStrokeType });
    ctx.beginPath();  // reset path to prevent line continuation on next stroke
  }
}

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const path of paths) {
    drawPath(ctx, path);
  }
}

function drawPath(ctx, path) {
  const pts = path.points;
  if (pts.length === 0) return;

  if (path.type === 'free') {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else {
    ctx.fillStyle = 'red';
    const symbol = path.type;
    const spacing = 15;

    for (let i = 0; i < pts.length; i += 1) {
      const { x, y } = pts[i];
      if (i % spacing === 0 || i === 0) {
        ctx.fillText(symbol, x, y);
      }
    }
  }
}

function getTodayInMountainTime() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const parts = formatter.formatToParts(now);

  const lookup = (type) => parts.find(p => p.type === type)?.value || '';
  const date = `${lookup('year')}-${lookup('month')}-${lookup('day')}`;
  const time = `${lookup('hour')}:${lookup('minute')} ${lookup('dayPeriod')}`;

  return `${date}_${time}`;
}

function undo() {
  if (paths.length === 0) return;
  redoStack.push(paths.pop());
  redrawCanvas();
}

function redo() {
  if (redoStack.length === 0) return;
  paths.push(redoStack.pop());
  redrawCanvas();
}

// Mouse events
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing); // handle dragging off canvas

// Touch events
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing);

document.addEventListener('DOMContentLoaded', () => {
  // set stroke type to free draw initially
  document.getElementById('stroke-type').value = 'free';
  currentStrokeType = 'free';
});

document.getElementById('stroke-type').addEventListener('change', (e) => {
  currentStrokeType = e.target.value;
})

document.getElementById('pain-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const mergedImage = await mergeCanvases(); // waits until image is ready

  const response = await fetch('/submit', {
    method: 'POST',
    body: JSON.stringify({
      image: mergedImage
    }),
    headers: { 'Content-Type': 'application/json' }
  });

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  //window.open(url);

  // create temporary link for download
  const a = document.createElement('a');
  a.href = url;
  a.download = `PainDrawing-${getTodayInMountainTime()}.pdf`;
  document.body.appendChild(a);
  a.click();

  // clean up download link
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // reset all form values after submission
  document.getElementById('pain-form').reset();

  // clear canvas and drawing state
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  paths = [];
  redoStack = [];
});

// This function will take the user's drawing and save it over
// body-diagram.png
async function mergeCanvases() {
  const mergedCanvas = document.getElementById('merged');
  const mergedCtx = mergedCanvas.getContext('2d');

  // Clear canvas
  mergedCtx.clearRect(0, 0, mergedCanvas.width, mergedCanvas.height);

  // Draw the background image
  const bgImage = new Image();
  bgImage.src = 'body-diagram.png'; // image path for body-diagram.png

  return new Promise((resolve) => {
    bgImage.onload = () => {
      mergedCtx.drawImage(bgImage, 0, 0, mergedCanvas.width, mergedCanvas.height);

      mergedCtx.font = '16px sans-serif';
      mergedCtx.fillStyle = 'red';
      mergedCtx.strokeStyle = 'red';

      // Redraw all saved paths
      for (const path of paths) {
          drawPath(mergedCtx, path);
      }

      resolve(mergedCanvas.toDataURL()); // export the merged image
    };
  });
}

