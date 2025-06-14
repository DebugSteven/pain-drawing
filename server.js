const express = require('express');
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

app.post('/submit', async (req, res) => {
  const { name, date, dob, examiner, image } = req.body;

  // Load a template PDF if you have one, or make blank
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);

  page.drawText(`Name: ${name}`, { x: 50, y: 750 });
  page.drawText(`Date: ${date}`, { x: 50, y: 770 });
  page.drawText(`Date of Birth: ${dob}`, { x: 50, y: 730 });
  page.drawText(`Examiner: ${examiner}`, { x: 50, y: 710 });

  const imageBytes = Buffer.from(image.split(',')[1], 'base64');
  const pngImage = await pdfDoc.embedPng(imageBytes);
  page.drawImage(pngImage, {
    x: 50,
    y: 0,
    width: 500,
    height: 700,
  });

  const pdfBytes = await pdfDoc.save();
  res.setHeader('Content-Type', 'application/pdf');
  res.send(Buffer.from(pdfBytes));
});

// app.listen(3000, '0.0.0.0', () => { console.log('Server running on http://<your-ip>:3000')});
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
