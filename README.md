# Pain Drawing

A web form where patients of Physical Therapy Doctors draw where they hurt on a
body diagram and download a PDF of the pain drawing page with their drawing on
it. Everything runs in the browser; nothing is sent to a server, and the page
asks for no patient information.

Deployed on Netlify (pain-drawing.netlify.app). Pushing to `main` deploys.

## Testing locally

Serve the folder:

```sh
python3 -m http.server 8000
```

then open http://localhost:8000.

**Don't open `index.html` directly.** From a `file://` URL the browser blocks
the page from loading `blank-pain-drawing-form.pdf`, and Download Drawing fails
with "Something went wrong while creating the PDF."

## Files

- `blank-pain-drawing-form.pdf`: the page the drawing goes on. Built from the
  Typst forms (`make pain-drawing`, then rename `pain-drawing-fields.pdf`). It
  has no page number; intake-merger adds the right one when it puts the page
  into an intake packet.
- `script.js`: drawing canvas and PDF export (pdf-lib).
- `body-diagram.png`: the same artwork the Typst page uses (403 x 463 px).
- `_headers`: Netlify security headers.

## If the form's layout changes

`buildFilledPdf()` in `script.js` places the drawing at the body diagram's
position in the PDF (`x`, `y`, `width`, `height` in points). If the diagram
moves or changes size on the page, read the new position from the PDF's image
matrix and update those four numbers.
