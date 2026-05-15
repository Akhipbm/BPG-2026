import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// Set up the worker
// @ts-ignore - Vite worker import
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface PageInfo {
  pageNumber: number;
  thumbnail: string;
  isBlank: boolean;
  selected: boolean;
}

export async function processPdf(file: File): Promise<{ pages: PageInfo[], pdfDoc: PDFDocument }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const pages: PageInfo[] = [];

  for (let i = 1; i <= pdfjsDoc.numPages; i++) {
    const page = await pdfjsDoc.getPage(i);
    const viewport = page.getViewport({ scale: 0.3 }); // Small scale for fast processing
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // @ts-ignore - Handle version differences in RenderParameters
      await page.render({ canvasContext: context, viewport }).promise;
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const isBlank = checkIfBlank(imageData);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      
      pages.push({
        pageNumber: i,
        thumbnail,
        isBlank,
        selected: !isBlank, // By default, keep non-blank pages
      });
    }
  }

  return { pages, pdfDoc };
}

function checkIfBlank(data: Uint8ClampedArray): boolean {
  let whitePixels = 0;
  const totalPixels = data.length / 4;
  
  // A simple heuristic: check if pixels are "close to white"
  // Scan every few pixels for performance if needed, but for small thumbnails it's fine to scan all
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Check if pixel is very bright (whitish)
    if (r > 245 && g > 245 && b > 245) {
      whitePixels++;
    }
  }
  
  const whiteRatio = whitePixels / totalPixels;
  // Threshold: if more than 99.8% of pixels are white, consider it blank
  return whiteRatio > 0.998;
}

export async function generateModifiedPdf(originalPdfDoc: PDFDocument, selectedPageIndices: number[]): Promise<Uint8Array> {
  const newPdfDoc = await PDFDocument.create();
  
  // selectedPageIndices is 0-indexed relative to original document
  const copiedPages = await newPdfDoc.copyPages(originalPdfDoc, selectedPageIndices);
  
  copiedPages.forEach((page) => {
    newPdfDoc.addPage(page);
  });
  
  return await newPdfDoc.save();
}
