import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from '../ai/ollama.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import * as crypto from 'crypto';
const PDFParser = require('pdf2json');

@Injectable()
export class IngestionService {
  constructor(
    private prisma: PrismaService,
    private ollamaService: OllamaService,
  ) {}

  async getUserUploads(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) return [];

    return this.prisma.uploadedBook.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
      }
    });
  }

  async processFile(profileId: string, fileBuffer: Buffer, filename: string) {
    // 1. Create Upload Record
    const uploadedBook = await this.prisma.uploadedBook.create({
      data: {
        profileId,
        title: filename,
        filePath: `uploads/${filename}`, 
        status: 'PROCESSING',
      },
    });

    try {
      // 2. Parse PDF
      const fullText = await new Promise<string>((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1);

        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));

        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
           try {
             const pages = pdfData.formImage?.Pages || [];
             const textContent = pages.map((page: any) => {
               return (page.Texts || []).map((textItem: any) => {
                 return (textItem.R || []).map((run: any) => decodeURIComponent(run.T)).join(" ");
               }).join(" ");
             }).join("\n\n");
             resolve(textContent);
           } catch (err) {
             reject(new Error("Failed to extract text structure"));
           }
        });

        pdfParser.parseBuffer(fileBuffer);
      });

      // --- CHANGED: LOGGING INSTEAD OF ERROR ---
      console.log(`[Ingestion] Extracted ${fullText.length} characters from ${filename}`);
      
      if (!fullText || fullText.trim().length === 0) {
          console.warn(`[Ingestion Warning] No text found in ${filename}. It might be an image scan.`);
          // We proceed anyway, but the AI will likely have no context.
      } else if (fullText.length < 200) {
          console.warn(`[Ingestion Warning] Very little text found: "${fullText}"`);
      }
      // -----------------------------------------

      // 3. Chunking
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      
      // Safety check: split empty text results in error, so fallback to placeholder
      const textToSplit = fullText || " "; 
      const chunks = await splitter.createDocuments([textToSplit]);

      // 4. Embed & Save Loop
      for (const chunk of chunks) {
        // If chunk is empty/whitespace, skip embedding to save resources
        if (!chunk.pageContent.trim()) continue;

        const embedding = await this.ollamaService.generateEmbedding(chunk.pageContent);
        const vectorLiteral = `[${embedding.join(',')}]`; 

        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "book_chunks" (id, "uploaded_book_id", content, embedding, metadata)
           VALUES ($1, $2, $3, '${vectorLiteral}'::vector, $4::jsonb)`,
           crypto.randomUUID(), 
           uploadedBook.id,
           chunk.pageContent,
           JSON.stringify(chunk.metadata)
        );
      }

      // 5. Update Status to READY
      await this.prisma.uploadedBook.update({
        where: { id: uploadedBook.id },
        data: { status: 'READY' },
      });

      return { success: true, chunksProcessed: chunks.length };

    } catch (error) {
      console.error('Ingestion Error:', error);
      await this.prisma.uploadedBook.update({
        where: { id: uploadedBook.id },
        data: { status: 'ERROR' },
      });
      throw error;
    }
  }
}