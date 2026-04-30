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

function getMountainTimestamp() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const parts = formatter.formatToParts(now);

  const lookup = (type) => parts.find(p => p.type === type)?.value || '';
  const date = `${lookup('year')}-${lookup('month')}-${lookup('day')}`;
  const time = `${lookup('hour')}:${lookup('minute')}:${lookup('second')} ${lookup('dayPeriod')}`;

  return `${date}_${time}`;
}

function downloadBlob(blob, extension) {
  const blobUrl = URL.createObjectURL(blob);
  const timestamp = getMountainTimestamp();
  const filename = `PainDrawing-${timestamp}.${extension}`;
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
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

  const submitButton = e.target.querySelector('button[type="submit"]');
  const originalLabel = submitButton ? submitButton.textContent : null;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Preparing PDF...';
  }

  try {
    const pdfBlob = await buildFilledPdf();
    downloadBlob(pdfBlob, 'pdf');

    // Clear canvas and drawing state after a successful download.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paths = [];
    redoStack = [];
    document.getElementById('stroke-type').value = 'free';
    currentStrokeType = 'free';
  } catch (err) {
    console.error('PDF download failed:', err);
    alert('Something went wrong while creating the PDF. Please try again.');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
});

// Returns a PNG blob containing only the user's drawing on a transparent
// background, sized to match the original body-diagram.png (403 x 463 px).
function getDrawingPngBlob() {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create drawing PNG blob'));
      }
    }, 'image/png');
  });
}

async function blobToArrayBuffer(blob) {
  if (blob.arrayBuffer) {
    return blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

// Loads the blank pain-drawing form PDF, overlays the user's drawing on top
// of the body diagram, and returns the result as a PDF Blob.
async function buildFilledPdf() {
  if (typeof PDFLib === 'undefined') {
    throw new Error('pdf-lib failed to load.');
  }

  const [pdfResponse, drawingBlob] = await Promise.all([
    fetch('blank-pain-drawing-form.pdf'),
    getDrawingPngBlob(),
  ]);

  if (!pdfResponse.ok) {
    throw new Error(`Failed to load form PDF (HTTP ${pdfResponse.status})`);
  }

  const [pdfBytes, drawingBytes] = await Promise.all([
    pdfResponse.arrayBuffer(),
    blobToArrayBuffer(drawingBlob),
  ]);

  const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
  const drawingImage = await pdfDoc.embedPng(drawingBytes);

  // Coordinates of the embedded body-diagram image inside the source PDF.
  // The cm matrix in the PDF content stream is `354 0 0 406.5 128.95 27.7`,
  // which means the image's bottom-left corner sits at (128.95, 27.7) and it
  // occupies 354 x 406.5 PDF points. Drawing the user's transparent drawing
  // PNG with the same placement aligns it perfectly over the body diagram.
  const page = pdfDoc.getPages()[0];
  page.drawImage(drawingImage, {
    x: 128.95,
    y: 27.7,
    width: 354,
    height: 406.5,
  });

  const filledPdfBytes = await pdfDoc.save();
  return new Blob([filledPdfBytes], { type: 'application/pdf' });
}

